use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

pub const UI_V1_EVENT_NAME: &str = "ui.v1.event";

#[derive(Debug, Clone, Copy, Default)]
pub struct DecodeLimits {
    pub max_bytes: Option<usize>,
    pub max_depth: Option<usize>,
}

#[derive(thiserror::Error, Debug)]
pub enum UiSpecError {
    #[error("json exceeds max_bytes")]
    MaxBytesExceeded,
    #[error("json exceeds max_depth")]
    MaxDepthExceeded,
    #[error("invalid json: {0}")]
    InvalidJson(#[from] serde_json::Error),
    #[error("validation error: {0}")]
    ValidationError(String),
}

fn exceeds_max_depth(value: &Value, max_depth: usize) -> bool {
    let mut stack: Vec<(&Value, usize)> = vec![(value, 1)];
    while let Some((current, depth)) = stack.pop() {
        if depth > max_depth {
            return true;
        }
        match current {
            Value::Array(items) => {
                for item in items {
                    stack.push((item, depth + 1));
                }
            }
            Value::Object(obj) => {
                for item in obj.values() {
                    stack.push((item, depth + 1));
                }
            }
            _ => {}
        }
    }
    false
}

fn check_limits(bytes: &[u8], value: &Value, limits: DecodeLimits) -> Result<(), UiSpecError> {
    if let Some(max_bytes) = limits.max_bytes {
        if bytes.len() > max_bytes {
            return Err(UiSpecError::MaxBytesExceeded);
        }
    }
    if let Some(max_depth) = limits.max_depth {
        if exceeds_max_depth(value, max_depth) {
            return Err(UiSpecError::MaxDepthExceeded);
        }
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiV1EventValue {
    pub component_id: String,
    pub event_name: String,
    pub payload: Map<String, Value>,
    pub client_request_id: String,
    pub base_revision: u64,
}

impl UiV1EventValue {
    pub fn validate(&self) -> Result<(), UiSpecError> {
        if self.component_id.trim().is_empty() {
            return Err(UiSpecError::ValidationError("componentId must be non-empty".into()));
        }
        if self.event_name.trim().is_empty() {
            return Err(UiSpecError::ValidationError("eventName must be non-empty".into()));
        }
        if self.client_request_id.trim().is_empty() {
            return Err(UiSpecError::ValidationError("clientRequestId must be non-empty".into()));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiV1CustomEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub name: String,
    pub value: UiV1EventValue,

    #[serde(default)]
    pub timestamp: Option<f64>,
    #[serde(default)]
    pub raw_event: Option<Value>,

    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

impl UiV1CustomEvent {
    pub fn validate(&self) -> Result<(), UiSpecError> {
        if self.event_type != "CUSTOM" {
            return Err(UiSpecError::ValidationError("type must be CUSTOM".into()));
        }
        if self.name != UI_V1_EVENT_NAME {
            return Err(UiSpecError::ValidationError("name must be ui.v1.event".into()));
        }
        self.value.validate()?;
        Ok(())
    }
}

pub fn parse_ui_v1_custom_event(bytes: &[u8], limits: DecodeLimits) -> Result<UiV1CustomEvent, UiSpecError> {
    let value: Value = serde_json::from_slice(bytes)?;
    check_limits(bytes, &value, limits)?;
    let event: UiV1CustomEvent = serde_json::from_value(value)?;
    event.validate()?;
    Ok(event)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiMountV1 {
    pub message_id: String,
    pub slot: String,
    pub order: i64,
}

impl UiMountV1 {
    pub fn validate(&self) -> Result<(), UiSpecError> {
        if self.message_id.trim().is_empty() {
            return Err(UiSpecError::ValidationError("mount.messageId must be non-empty".into()));
        }
        if self.slot.trim().is_empty() {
            return Err(UiSpecError::ValidationError("mount.slot must be non-empty".into()));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UiComponentStatusV1 {
    Building,
    Ready,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiComponentErrorV1 {
    pub code: String,
    pub message: String,
    #[serde(default)]
    pub details: Option<Map<String, Value>>,

    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

impl UiComponentErrorV1 {
    pub fn validate(&self) -> Result<(), UiSpecError> {
        if self.code.trim().is_empty() {
            return Err(UiSpecError::ValidationError("component.error.code must be non-empty".into()));
        }
        if self.message.trim().is_empty() {
            return Err(UiSpecError::ValidationError("component.error.message must be non-empty".into()));
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiComponentV1 {
    #[serde(rename = "type")]
    pub component_type: String,
    pub schema_version: u64,
    pub props: Map<String, Value>,

    #[serde(default)]
    pub state: Option<Map<String, Value>>,

    pub revision: u64,
    pub mounts: Vec<UiMountV1>,

    #[serde(default)]
    pub status: Option<UiComponentStatusV1>,
    #[serde(default)]
    pub error: Option<UiComponentErrorV1>,

    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

impl UiComponentV1 {
    pub fn validate(&self) -> Result<(), UiSpecError> {
        let status = self.status.as_ref().unwrap_or(&UiComponentStatusV1::Ready);
        if *status == UiComponentStatusV1::Error {
            let Some(err) = &self.error else {
                return Err(UiSpecError::ValidationError("component.error must be set when status=error".into()));
            };
            err.validate()?;
        } else if self.error.is_some() {
            return Err(UiSpecError::ValidationError("component.error must be omitted unless status=error".into()));
        }

        if self.component_type.trim().is_empty() {
            return Err(UiSpecError::ValidationError("component.type must be non-empty".into()));
        }
        if self.schema_version == 0 {
            return Err(UiSpecError::ValidationError("component.schemaVersion must be >= 1".into()));
        }
        for mount in &self.mounts {
            mount.validate()?;
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UiStateV1 {
    pub v: u64,
    pub components: BTreeMap<String, UiComponentV1>,

    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

impl UiStateV1 {
    pub fn validate(&self) -> Result<(), UiSpecError> {
        if self.v != 1 {
            return Err(UiSpecError::ValidationError("ui.v must be 1".into()));
        }
        for (id, component) in &self.components {
            if id.trim().is_empty() {
                return Err(UiSpecError::ValidationError("componentId must be non-empty".into()));
            }
            component.validate()?;
        }
        Ok(())
    }
}

pub fn parse_ui_state_v1(bytes: &[u8], limits: DecodeLimits) -> Result<UiStateV1, UiSpecError> {
    let value: Value = serde_json::from_slice(bytes)?;
    check_limits(bytes, &value, limits)?;
    let state: UiStateV1 = serde_json::from_value(value)?;
    state.validate()?;
    Ok(state)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReduceGapV1 {
    pub expected_seq: u64,
    pub got_seq: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReduceResultV1 {
    pub status: String,
    pub last_seq: u64,
    pub needs_resync: bool,
    pub shared_state: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gap: Option<ReduceGapV1>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ReduceEnvelopeV1 {
    pub seq: u64,
    pub event: Value,
}

fn decode_pointer_token(token: &str) -> String {
    token.replace("~1", "/").replace("~0", "~")
}

fn pointer_tokens(path: &str) -> Result<Vec<String>, ()> {
    if path.is_empty() {
        return Ok(vec![]);
    }
    if !path.starts_with('/') {
        return Err(());
    }
    Ok(path
        .split('/')
        .skip(1)
        .map(decode_pointer_token)
        .collect::<Vec<_>>())
}

fn apply_single_patch_op(doc: &mut Value, op: &Map<String, Value>) -> Result<(), ()> {
    let op_name = op.get("op").and_then(Value::as_str).ok_or(())?;
    let path = op.get("path").and_then(Value::as_str).ok_or(())?;
    let tokens = pointer_tokens(path)?;
    if tokens.is_empty() {
        return Err(());
    }

    let mut current = doc;
    for token in &tokens[..tokens.len() - 1] {
        match current {
            Value::Object(map) => {
                let next = map.get_mut(token).ok_or(())?;
                current = next;
            }
            Value::Array(arr) => {
                let idx: usize = token.parse().map_err(|_| ())?;
                let next = arr.get_mut(idx).ok_or(())?;
                current = next;
            }
            _ => return Err(()),
        }
    }

    let last = tokens.last().ok_or(())?.as_str();
    let value = op.get("value").cloned();

    match current {
        Value::Object(map) => match op_name {
            "add" => {
                map.insert(last.to_string(), value.ok_or(())?);
                Ok(())
            }
            "replace" => {
                if !map.contains_key(last) {
                    return Err(());
                }
                map.insert(last.to_string(), value.ok_or(())?);
                Ok(())
            }
            _ => Err(()),
        },
        Value::Array(arr) => match op_name {
            "add" => {
                if last == "-" {
                    arr.push(value.ok_or(())?);
                    return Ok(());
                }
                let idx: usize = last.parse().map_err(|_| ())?;
                if idx > arr.len() {
                    return Err(());
                }
                arr.insert(idx, value.ok_or(())?);
                Ok(())
            }
            "replace" => {
                let idx: usize = last.parse().map_err(|_| ())?;
                let slot = arr.get_mut(idx).ok_or(())?;
                *slot = value.ok_or(())?;
                Ok(())
            }
            _ => Err(()),
        },
        _ => Err(()),
    }
}

fn apply_json_patch(doc: &Value, delta: &[Value]) -> Result<Value, ()> {
    let mut next = doc.clone();
    for item in delta {
        let op = item.as_object().ok_or(())?;
        apply_single_patch_op(&mut next, op)?;
    }
    Ok(next)
}

pub fn reduce_envelopes_v1(envelopes: &[ReduceEnvelopeV1]) -> ReduceResultV1 {
    let mut last_seq: u64 = 0;
    let mut shared_state: Value = Value::Object(Map::new());

    for env in envelopes {
        if env.seq <= last_seq {
            continue;
        }

        if env.seq > last_seq + 1 {
            return ReduceResultV1 {
                status: "gap".into(),
                last_seq,
                needs_resync: true,
                shared_state,
                gap: Some(ReduceGapV1 {
                    expected_seq: last_seq + 1,
                    got_seq: env.seq,
                }),
            };
        }

        let event_type = env.event.get("type").and_then(Value::as_str).unwrap_or("");
        if event_type == "STATE_SNAPSHOT" {
            let snapshot = env.event.get("snapshot").cloned().unwrap_or(Value::Null);
            if !snapshot.is_object() {
                return ReduceResultV1 {
                    status: "patch_error".into(),
                    last_seq,
                    needs_resync: true,
                    shared_state,
                    gap: None,
                };
            }
            shared_state = snapshot;
            last_seq = env.seq;
            continue;
        }

        if event_type == "STATE_DELTA" {
            let delta = env
                .event
                .get("delta")
                .and_then(Value::as_array)
                .cloned()
                .unwrap_or_default();
            match apply_json_patch(&shared_state, &delta) {
                Ok(next) => {
                    shared_state = next;
                    last_seq = env.seq;
                    continue;
                }
                Err(_) => {
                    return ReduceResultV1 {
                        status: "patch_error".into(),
                        last_seq,
                        needs_resync: true,
                        shared_state,
                        gap: None,
                    };
                }
            }
        }

        last_seq = env.seq;
    }

    ReduceResultV1 {
        status: "ok".into(),
        last_seq,
        needs_resync: false,
        shared_state,
        gap: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_custom_event() {
        let json = br#"{
          "type":"CUSTOM",
          "name":"ui.v1.event",
          "value":{
            "componentId":"cmp_1",
            "eventName":"submit",
            "payload":{},
            "clientRequestId":"req_1",
            "baseRevision":0
          }
        }"#;

        let event = parse_ui_v1_custom_event(json, DecodeLimits::default()).unwrap();
        assert_eq!(event.name, UI_V1_EVENT_NAME);
        assert_eq!(event.value.component_id, "cmp_1");
    }
}
