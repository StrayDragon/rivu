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
