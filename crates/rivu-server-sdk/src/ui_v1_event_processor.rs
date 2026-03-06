use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::{json, Map, Number, Value};

use crate::ui_spec::{reduce_envelopes_v1, ReduceEnvelopeV1, UiComponentV1, UiV1CustomEvent};

pub type AuthorizeHook =
    Box<dyn Fn(&UiV1CustomEvent, &UiComponentV1) -> Result<(), UiV1EventProcessorError> + Send + Sync>;

#[derive(Debug, Clone)]
pub struct ProcessedResult {
    pub shared_state: Value,
    pub events: Vec<Value>,
    pub component_id: String,
    pub client_request_id: String,
    pub new_revision: u64,
}

#[derive(thiserror::Error, Debug)]
pub enum UiV1EventProcessorError {
    #[error("component not found: {0}")]
    ComponentNotFound(String),
    #[error("invalid shared_state.ui")]
    InvalidUiState,
    #[error("revision conflict: baseRevision={base_revision} currentRevision={current_revision}")]
    RevisionConflict {
        base_revision: u64,
        current_revision: u64,
    },
    #[error("authorization denied: {0}")]
    AuthorizationDenied(String),
    #[error("invalid payload: {0}")]
    InvalidPayload(String),
    #[error("patch error")]
    PatchError,
    #[error("json decode error: {0}")]
    JsonDecode(#[from] serde_json::Error),
}

pub struct UiV1EventProcessor {
    authorize: Option<AuthorizeHook>,
    idempotency: Mutex<HashMap<String, ProcessedResult>>,
}

impl Default for UiV1EventProcessor {
    fn default() -> Self {
        Self {
            authorize: None,
            idempotency: Mutex::new(HashMap::new()),
        }
    }
}

impl UiV1EventProcessor {
    pub fn with_authorize(authorize: AuthorizeHook) -> Self {
        Self {
            authorize: Some(authorize),
            idempotency: Mutex::new(HashMap::new()),
        }
    }

    pub fn process(&self, shared_state: &Value, event: &UiV1CustomEvent) -> Result<ProcessedResult, UiV1EventProcessorError> {
        let component_id = event.value.component_id.clone();
        let client_request_id = event.value.client_request_id.clone();

        if let Some(existing) = self
            .idempotency
            .lock()
            .expect("idempotency lock")
            .get(&client_request_id)
            .cloned()
        {
            return Ok(existing);
        }

        let component_value = shared_state
            .get("ui")
            .and_then(|ui| ui.get("components"))
            .and_then(|c| c.get(&component_id))
            .ok_or_else(|| UiV1EventProcessorError::ComponentNotFound(component_id.clone()))?;

        let component: UiComponentV1 = serde_json::from_value(component_value.clone())?;

        if event.value.base_revision != component.revision {
            return Err(UiV1EventProcessorError::RevisionConflict {
                base_revision: event.value.base_revision,
                current_revision: component.revision,
            });
        }

        if let Some(hook) = &self.authorize {
            hook(event, &component)?;
        }

        let (next_state, next_revision) = apply_component_event(&component, event)?;

        let patch_ops = vec![
            json!({
                "op": "add",
                "path": format!("/ui/components/{}/state", encode_pointer(&component_id)),
                "value": next_state,
            }),
            json!({
                "op": "replace",
                "path": format!("/ui/components/{}/revision", encode_pointer(&component_id)),
                "value": next_revision,
            }),
        ];

        let snapshot_event = json!({ "type": "STATE_SNAPSHOT", "snapshot": shared_state.clone() });
        let delta_event = json!({ "type": "STATE_DELTA", "delta": patch_ops.clone() });
        let envs = vec![
            ReduceEnvelopeV1 {
                seq: 1,
                event: snapshot_event,
            },
            ReduceEnvelopeV1 { seq: 2, event: delta_event.clone() },
        ];
        let reduced = reduce_envelopes_v1(&envs);
        if reduced.status != "ok" {
            return Err(UiV1EventProcessorError::PatchError);
        }

        let result = ProcessedResult {
            shared_state: reduced.shared_state.clone(),
            events: vec![delta_event],
            component_id: component_id.clone(),
            client_request_id: client_request_id.clone(),
            new_revision: next_revision,
        };

        self.idempotency
            .lock()
            .expect("idempotency lock")
            .insert(client_request_id, result.clone());

        Ok(result)
    }
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn is_finite_number(v: &Value) -> bool {
    match v {
        Value::Number(n) => n.as_f64().is_some_and(|f| f.is_finite()),
        _ => false,
    }
}

fn apply_component_event(component: &UiComponentV1, event: &UiV1CustomEvent) -> Result<(Value, u64), UiV1EventProcessorError> {
    let mut state: Map<String, Value> = component.state.clone().unwrap_or_default();

    match component.component_type.as_str() {
        "ApprovalCard" => {
            match event.value.event_name.as_str() {
                "approve" => {
                    state.insert("status".into(), Value::String("approved".into()));
                }
                "deny" => {
                    state.insert("status".into(), Value::String("denied".into()));
                }
                other => {
                    return Err(UiV1EventProcessorError::InvalidPayload(format!(
                        "unsupported ApprovalCard eventName: {}",
                        other
                    )))
                }
            }
            state.entry("decidedAtMs").or_insert_with(|| Value::Number(Number::from(now_ms())));
            Ok((Value::Object(state), component.revision + 1))
        }
        "ConfirmCard" => {
            match event.value.event_name.as_str() {
                "confirm" => {
                    state.insert("status".into(), Value::String("confirmed".into()));
                }
                "cancel" => {
                    state.insert("status".into(), Value::String("cancelled".into()));
                }
                other => {
                    return Err(UiV1EventProcessorError::InvalidPayload(format!(
                        "unsupported ConfirmCard eventName: {}",
                        other
                    )))
                }
            }
            state.entry("decidedAtMs").or_insert_with(|| Value::Number(Number::from(now_ms())));
            Ok((Value::Object(state), component.revision + 1))
        }
        "Chart" => match event.value.event_name.as_str() {
            "chart.clearSelection" => {
                state.insert("selection".into(), json!({ "kind": "none" }));
                Ok((Value::Object(state), component.revision + 1))
            }
            "chart.setSelection" => {
                let selection = event
                    .value
                    .payload
                    .get("selection")
                    .and_then(Value::as_object)
                    .ok_or_else(|| UiV1EventProcessorError::InvalidPayload("payload.selection must be an object".into()))?;

                let kind = selection.get("kind").and_then(Value::as_str).unwrap_or("");

                let allowed: &[&str] = match kind {
                    "none" => &["kind"],
                    "point" => &["kind", "rowIndex"],
                    "range" => &["kind", "column", "from", "to"],
                    "series" => &["kind", "value"],
                    _ => &[],
                };
                if allowed.is_empty() {
                    return Err(UiV1EventProcessorError::InvalidPayload(
                        "payload.selection.kind must be one of \"none\"|\"point\"|\"range\"|\"series\"".into(),
                    ));
                }
                for key in selection.keys() {
                    if !allowed.contains(&key.as_str()) {
                        return Err(UiV1EventProcessorError::InvalidPayload(format!(
                            "payload.selection contains unknown field: {}",
                            key
                        )));
                    }
                }

                let next_selection = match kind {
                    "none" => json!({ "kind": "none" }),
                    "point" => {
                        let row_index = selection.get("rowIndex").and_then(Value::as_i64).unwrap_or(-1);
                        if row_index < 0 {
                            return Err(UiV1EventProcessorError::InvalidPayload(
                                "payload.selection.rowIndex must be a non-negative integer".into(),
                            ));
                        }

                        let data = component
                            .props
                            .get("data")
                            .and_then(Value::as_object)
                            .ok_or_else(|| UiV1EventProcessorError::InvalidPayload("Chart props.data must be an object".into()))?;
                        let rows_len = data
                            .get("rows")
                            .and_then(Value::as_array)
                            .ok_or_else(|| UiV1EventProcessorError::InvalidPayload("Chart props.data.rows must be an array".into()))?
                            .len();

                        if (row_index as usize) >= rows_len {
                            return Err(UiV1EventProcessorError::InvalidPayload(format!(
                                "payload.selection.rowIndex out of range: rowIndex={} rows={}",
                                row_index, rows_len
                            )));
                        }

                        json!({ "kind": "point", "rowIndex": row_index })
                    }
                    "range" => {
                        let column = selection.get("column").and_then(Value::as_str).unwrap_or("").trim();
                        if column.is_empty() {
                            return Err(UiV1EventProcessorError::InvalidPayload(
                                "payload.selection.column must be a non-empty string".into(),
                            ));
                        }
                        let from = selection.get("from").ok_or_else(|| {
                            UiV1EventProcessorError::InvalidPayload("payload.selection.from must be string|number|null".into())
                        })?;
                        let to = selection.get("to").ok_or_else(|| {
                            UiV1EventProcessorError::InvalidPayload("payload.selection.to must be string|number|null".into())
                        })?;
                        let ok_from = from.is_null() || from.is_string() || is_finite_number(from);
                        let ok_to = to.is_null() || to.is_string() || is_finite_number(to);
                        if !ok_from {
                            return Err(UiV1EventProcessorError::InvalidPayload(
                                "payload.selection.from must be string|number|null".into(),
                            ));
                        }
                        if !ok_to {
                            return Err(UiV1EventProcessorError::InvalidPayload(
                                "payload.selection.to must be string|number|null".into(),
                            ));
                        }
                        json!({ "kind": "range", "column": column, "from": from, "to": to })
                    }
                    "series" => {
                        let value = selection.get("value").unwrap_or(&Value::Null);
                        if !(value.is_string() || is_finite_number(value)) {
                            return Err(UiV1EventProcessorError::InvalidPayload(
                                "payload.selection.value must be string|number".into(),
                            ));
                        }
                        json!({ "kind": "series", "value": value })
                    }
                    _ => unreachable!("allowed kinds handled above"),
                };

                state.insert("selection".into(), next_selection);
                Ok((Value::Object(state), component.revision + 1))
            }
            other => Err(UiV1EventProcessorError::InvalidPayload(format!(
                "unsupported Chart eventName: {}",
                other
            ))),
        },
        "FileUploadCard" => match event.value.event_name.as_str() {
            "file.add" => {
                if event.value.payload.len() != 1 || !event.value.payload.contains_key("file") {
                    return Err(UiV1EventProcessorError::InvalidPayload("payload must have only file".into()));
                }

                let file = event.value.payload.get("file").unwrap_or(&Value::Null);
                let file_obj = file.as_object().ok_or_else(|| UiV1EventProcessorError::InvalidPayload("payload.file must be an object".into()))?;

                let allowed = ["id", "name", "sizeBytes", "mimeType", "url"];
                for key in file_obj.keys() {
                    if !allowed.contains(&key.as_str()) {
                        return Err(UiV1EventProcessorError::InvalidPayload(
                            "payload.file contains unexpected keys".into(),
                        ));
                    }
                }

                let file_id = file_obj.get("id").and_then(Value::as_str).unwrap_or("").trim();
                if file_id.is_empty() {
                    return Err(UiV1EventProcessorError::InvalidPayload(
                        "payload.file.id must be a non-empty string".into(),
                    ));
                }

                let name = file_obj.get("name").and_then(Value::as_str).unwrap_or("").trim();
                if name.is_empty() {
                    return Err(UiV1EventProcessorError::InvalidPayload(
                        "payload.file.name must be a non-empty string".into(),
                    ));
                }

                let size_bytes = file_obj
                    .get("sizeBytes")
                    .and_then(Value::as_i64)
                    .ok_or_else(|| UiV1EventProcessorError::InvalidPayload("payload.file.sizeBytes must be a non-negative int".into()))?;
                if size_bytes < 0 {
                    return Err(UiV1EventProcessorError::InvalidPayload(
                        "payload.file.sizeBytes must be a non-negative int".into(),
                    ));
                }

                if let Some(mime_type) = file_obj.get("mimeType") {
                    let mime_type_str = mime_type.as_str().unwrap_or("").trim();
                    if mime_type_str.is_empty() {
                        return Err(UiV1EventProcessorError::InvalidPayload(
                            "payload.file.mimeType must be a non-empty string".into(),
                        ));
                    }
                }

                if let Some(url) = file_obj.get("url") {
                    let url_str = url.as_str().unwrap_or("").trim();
                    if url_str.is_empty() {
                        return Err(UiV1EventProcessorError::InvalidPayload(
                            "payload.file.url must be a non-empty string".into(),
                        ));
                    }
                }

                let mut files: Vec<Value> = match state.remove("files") {
                    Some(Value::Array(arr)) => arr,
                    _ => Vec::new(),
                };
                files.push(file.clone());
                state.insert("files".into(), Value::Array(files));

                Ok((Value::Object(state), component.revision + 1))
            }
            "file.remove" => {
                if event.value.payload.len() != 1 || !event.value.payload.contains_key("fileId") {
                    return Err(UiV1EventProcessorError::InvalidPayload("payload must have only fileId".into()));
                }

                let file_id = event.value.payload.get("fileId").and_then(Value::as_str).unwrap_or("").trim();
                if file_id.is_empty() {
                    return Err(UiV1EventProcessorError::InvalidPayload(
                        "payload.fileId must be a non-empty string".into(),
                    ));
                }

                let files: Vec<Value> = match state.remove("files") {
                    Some(Value::Array(arr)) => arr,
                    _ => Vec::new(),
                };
                let mut next_files: Vec<Value> = Vec::with_capacity(files.len());
                for item in files {
                    let keep = item
                        .as_object()
                        .and_then(|o| o.get("id"))
                        .and_then(Value::as_str)
                        .map(|id| id != file_id)
                        .unwrap_or(true);
                    if keep {
                        next_files.push(item);
                    }
                }
                state.insert("files".into(), Value::Array(next_files));

                Ok((Value::Object(state), component.revision + 1))
            }
            "file.submit" => {
                if !event.value.payload.is_empty() {
                    return Err(UiV1EventProcessorError::InvalidPayload("payload must be empty".into()));
                }
                state.insert("status".into(), Value::String("submitted".into()));
                Ok((Value::Object(state), component.revision + 1))
            }
            other => Err(UiV1EventProcessorError::InvalidPayload(format!(
                "unsupported FileUploadCard eventName: {}",
                other
            ))),
        },
        "MultiStepWizard" => match event.value.event_name.as_str() {
            "wizard.setField" => {
                if event.value.payload.len() != 2 || !event.value.payload.contains_key("fieldId") || !event.value.payload.contains_key("value") {
                    return Err(UiV1EventProcessorError::InvalidPayload(
                        "payload must have only fieldId and value".into(),
                    ));
                }

                let field_id = event
                    .value
                    .payload
                    .get("fieldId")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                if field_id.trim().is_empty() {
                    return Err(UiV1EventProcessorError::InvalidPayload(
                        "payload.fieldId must be a non-empty string".into(),
                    ));
                }

                let value = event.value.payload.get("value").unwrap_or(&Value::Null);
                if !(value.is_null() || value.is_string() || is_finite_number(value)) {
                    return Err(UiV1EventProcessorError::InvalidPayload(
                        "payload.value must be string|number|null".into(),
                    ));
                }

                let mut values_obj: Map<String, Value> = match state.remove("values") {
                    Some(Value::Object(map)) => map,
                    _ => Map::new(),
                };
                values_obj.insert(field_id.clone(), value.clone());
                state.insert("values".into(), Value::Object(values_obj));

                let mut errors_obj: Map<String, Value> = match state.remove("errors") {
                    Some(Value::Object(map)) => map,
                    _ => Map::new(),
                };
                errors_obj.remove(&field_id);
                state.insert("errors".into(), Value::Object(errors_obj));

                Ok((Value::Object(state), component.revision + 1))
            }
            "wizard.next" | "wizard.prev" | "wizard.submit" | "wizard.reset" => {
                if !event.value.payload.is_empty() {
                    return Err(UiV1EventProcessorError::InvalidPayload("payload must be empty".into()));
                }

                if event.value.event_name == "wizard.submit" {
                    state.insert("status".into(), Value::String("submitted".into()));
                    return Ok((Value::Object(state), component.revision + 1));
                }

                let steps = component
                    .props
                    .get("steps")
                    .and_then(Value::as_array)
                    .ok_or_else(|| UiV1EventProcessorError::InvalidPayload("MultiStepWizard props.steps must be an array".into()))?;
                if steps.is_empty() {
                    return Err(UiV1EventProcessorError::InvalidPayload(
                        "MultiStepWizard props.steps must be a non-empty array".into(),
                    ));
                }

                let mut step_ids: Vec<String> = Vec::with_capacity(steps.len());
                for step in steps {
                    let step_id = step
                        .as_object()
                        .and_then(|o| o.get("id"))
                        .and_then(Value::as_str)
                        .unwrap_or("")
                        .to_string();
                    if step_id.trim().is_empty() {
                        return Err(UiV1EventProcessorError::InvalidPayload(
                            "MultiStepWizard step.id must be a non-empty string".into(),
                        ));
                    }
                    step_ids.push(step_id);
                }

                let current_step_id = state.get("currentStepId").and_then(Value::as_str).unwrap_or("").trim();
                let mut idx = step_ids.iter().position(|id| id == current_step_id).unwrap_or(0);

                match event.value.event_name.as_str() {
                    "wizard.next" => {
                        if idx + 1 < step_ids.len() {
                            idx += 1;
                            state.insert("currentStepId".into(), Value::String(step_ids[idx].clone()));
                        }
                        Ok((Value::Object(state), component.revision + 1))
                    }
                    "wizard.prev" => {
                        if idx > 0 {
                            idx -= 1;
                            state.insert("currentStepId".into(), Value::String(step_ids[idx].clone()));
                        }
                        Ok((Value::Object(state), component.revision + 1))
                    }
                    "wizard.reset" => {
                        state.insert("currentStepId".into(), Value::String(step_ids[0].clone()));
                        state.insert("values".into(), Value::Object(Map::new()));
                        state.remove("errors");
                        state.remove("disabled");
                        state.insert("status".into(), Value::String("idle".into()));
                        Ok((Value::Object(state), component.revision + 1))
                    }
                    _ => unreachable!("only wizard.next/prev/submit/reset handled above"),
                }
            }
            other => Err(UiV1EventProcessorError::InvalidPayload(format!(
                "unsupported MultiStepWizard eventName: {}",
                other
            ))),
        },
        "FormCard" => match event.value.event_name.as_str() {
            "setField" => {
                let field_id = event
                    .value
                    .payload
                    .get("fieldId")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                if field_id.trim().is_empty() {
                    return Err(UiV1EventProcessorError::InvalidPayload(
                        "payload.fieldId must be a non-empty string".into(),
                    ));
                }
                let value = event.value.payload.get("value").cloned().unwrap_or(Value::Null);

                let mut values_obj: Map<String, Value> = match state.remove("values") {
                    Some(Value::Object(map)) => map,
                    _ => Map::new(),
                };
                values_obj.insert(field_id.clone(), value);
                state.insert("values".into(), Value::Object(values_obj));

                let mut errors_obj: Map<String, Value> = match state.remove("errors") {
                    Some(Value::Object(map)) => map,
                    _ => Map::new(),
                };
                errors_obj.remove(&field_id);
                state.insert("errors".into(), Value::Object(errors_obj));

                Ok((Value::Object(state), component.revision + 1))
            }
            "submit" => {
                if let Some(Value::Object(values)) = event.value.payload.get("values") {
                    let mut values_obj: Map<String, Value> = match state.remove("values") {
                        Some(Value::Object(map)) => map,
                        _ => Map::new(),
                    };
                    for (k, v) in values {
                        values_obj.insert(k.clone(), v.clone());
                    }
                    state.insert("values".into(), Value::Object(values_obj));
                }
                state.insert("status".into(), Value::String("submitted".into()));
                Ok((Value::Object(state), component.revision + 1))
            }
            other => Err(UiV1EventProcessorError::InvalidPayload(format!(
                "unsupported FormCard eventName: {}",
                other
            ))),
        },
        other => Err(UiV1EventProcessorError::InvalidPayload(format!(
            "unsupported component type: {}",
            other
        ))),
    }
}

fn encode_pointer(token: &str) -> String {
    token.replace('~', "~0").replace('/', "~1")
}
