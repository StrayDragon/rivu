use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::ui_spec::A2uiV1;
use crate::UiSpecError;
use crate::UiV1CustomEvent;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UiInputDecodeLimitsV1 {
    #[serde(default)]
    pub max_bytes: Option<u64>,
    #[serde(default)]
    pub max_depth: Option<u64>,
    #[serde(default)]
    pub max_string_length: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UiInputUiEventLimitsV1 {
    #[serde(default)]
    pub max_payload_keys: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UiInputUiStateLimitsV1 {
    #[serde(default)]
    pub max_components: Option<u64>,
    #[serde(default)]
    pub max_mounts_total: Option<u64>,
    #[serde(default)]
    pub max_datasets: Option<u64>,
    #[serde(default)]
    pub max_dataset_rows: Option<u64>,
    #[serde(default)]
    pub max_dataset_columns: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UiInputJsonPatchLimitsV1 {
    #[serde(default)]
    pub max_ops: Option<u64>,
    #[serde(default)]
    pub max_path_length: Option<u64>,
    #[serde(default)]
    pub allowed_path_prefixes: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UiInputLimitsV1 {
    #[serde(default)]
    pub decode: Option<UiInputDecodeLimitsV1>,
    #[serde(default)]
    pub ui_event: Option<UiInputUiEventLimitsV1>,
    #[serde(default)]
    pub ui_state: Option<UiInputUiStateLimitsV1>,
    #[serde(default)]
    pub json_patch: Option<UiInputJsonPatchLimitsV1>,
}

impl UiInputLimitsV1 {
    pub fn validate(&self) -> Result<(), UiSpecError> {
        fn validate_positive(v: Option<u64>, name: &str) -> Result<(), UiSpecError> {
            if let Some(v) = v {
                if v == 0 {
                    return Err(UiSpecError::ValidationError(format!("{name} must be >= 1")));
                }
            }
            Ok(())
        }

        if let Some(decode) = &self.decode {
            validate_positive(decode.max_bytes, "decode.maxBytes")?;
            validate_positive(decode.max_depth, "decode.maxDepth")?;
            validate_positive(decode.max_string_length, "decode.maxStringLength")?;
        }
        if let Some(ui_event) = &self.ui_event {
            validate_positive(ui_event.max_payload_keys, "uiEvent.maxPayloadKeys")?;
        }
        if let Some(ui_state) = &self.ui_state {
            validate_positive(ui_state.max_components, "uiState.maxComponents")?;
            validate_positive(ui_state.max_mounts_total, "uiState.maxMountsTotal")?;
            validate_positive(ui_state.max_datasets, "uiState.maxDatasets")?;
            validate_positive(ui_state.max_dataset_rows, "uiState.maxDatasetRows")?;
            validate_positive(ui_state.max_dataset_columns, "uiState.maxDatasetColumns")?;
        }
        if let Some(json_patch) = &self.json_patch {
            validate_positive(json_patch.max_ops, "jsonPatch.maxOps")?;
            validate_positive(json_patch.max_path_length, "jsonPatch.maxPathLength")?;
            if let Some(prefixes) = &json_patch.allowed_path_prefixes {
                for p in prefixes {
                    if p.trim().is_empty() {
                        return Err(UiSpecError::ValidationError("jsonPatch.allowedPathPrefixes must be non-empty".into()));
                    }
                }
            }
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LimitExceededErrorV1 {
    pub code: String,
    pub limit: String,
    pub max: u64,
    pub observed: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
}

fn limit_exceeded(limit: &str, max: u64, observed: u64) -> LimitExceededErrorV1 {
    LimitExceededErrorV1 {
        code: "LIMIT_EXCEEDED".into(),
        limit: limit.into(),
        max,
        observed,
        path: None,
    }
}

#[derive(thiserror::Error, Debug)]
pub enum DecodeUiV1CustomEventErrorV1 {
    #[error(transparent)]
    Spec(#[from] UiSpecError),
    #[error("limit exceeded")]
    LimitExceeded(LimitExceededErrorV1),
}

#[derive(thiserror::Error, Debug)]
pub enum DecodeA2uiV1ErrorV1 {
    #[error(transparent)]
    Spec(#[from] UiSpecError),
    #[error("limit exceeded")]
    LimitExceeded(LimitExceededErrorV1),
}

fn compute_max_depth(value: &Value) -> u64 {
    let mut max_seen: u64 = 1;
    let mut stack: Vec<(&Value, u64)> = vec![(value, 1)];
    while let Some((current, depth)) = stack.pop() {
        if depth > max_seen {
            max_seen = depth;
        }
        match current {
            Value::Array(items) => {
                for item in items {
                    stack.push((item, depth + 1));
                }
            }
            Value::Object(obj) => {
                for v in obj.values() {
                    stack.push((v, depth + 1));
                }
            }
            _ => {}
        }
    }
    max_seen
}

fn compute_max_string_length(value: &Value) -> u64 {
    let mut max_seen: u64 = 0;
    let mut stack: Vec<&Value> = vec![value];
    while let Some(current) = stack.pop() {
        match current {
            Value::String(s) => {
                max_seen = max_seen.max(s.len() as u64);
            }
            Value::Array(items) => {
                for item in items {
                    stack.push(item);
                }
            }
            Value::Object(obj) => {
                for (k, v) in obj {
                    max_seen = max_seen.max(k.len() as u64);
                    stack.push(v);
                }
            }
            _ => {}
        }
    }
    max_seen
}

pub fn decode_ui_v1_custom_event_with_limits_v1(
    bytes: &[u8],
    limits: &UiInputLimitsV1,
) -> Result<UiV1CustomEvent, DecodeUiV1CustomEventErrorV1> {
    if let Some(decode) = &limits.decode {
        if let Some(max_bytes) = decode.max_bytes {
            let observed = bytes.len() as u64;
            if observed > max_bytes {
                return Err(DecodeUiV1CustomEventErrorV1::LimitExceeded(limit_exceeded(
                    "decode.maxBytes",
                    max_bytes,
                    observed,
                )));
            }
        }
    }

    let value: Value = serde_json::from_slice(bytes).map_err(UiSpecError::from)?;

    if let Some(decode) = &limits.decode {
        if let Some(max_depth) = decode.max_depth {
            let observed = compute_max_depth(&value);
            if observed > max_depth {
                return Err(DecodeUiV1CustomEventErrorV1::LimitExceeded(limit_exceeded(
                    "decode.maxDepth",
                    max_depth,
                    observed,
                )));
            }
        }
        if let Some(max_string_length) = decode.max_string_length {
            let observed = compute_max_string_length(&value);
            if observed > max_string_length {
                return Err(DecodeUiV1CustomEventErrorV1::LimitExceeded(limit_exceeded(
                    "decode.maxStringLength",
                    max_string_length,
                    observed,
                )));
            }
        }
    }

    let event: UiV1CustomEvent = serde_json::from_value(value).map_err(UiSpecError::from)?;
    event.validate()?;

    if let Some(ui_event) = &limits.ui_event {
        if let Some(max_payload_keys) = ui_event.max_payload_keys {
            let observed = event.value.payload.len() as u64;
            if observed > max_payload_keys {
                return Err(DecodeUiV1CustomEventErrorV1::LimitExceeded(limit_exceeded(
                    "uiEvent.maxPayloadKeys",
                    max_payload_keys,
                    observed,
                )));
            }
        }
    }

    Ok(event)
}

pub fn decode_a2ui_v1_with_limits_v1(bytes: &[u8], limits: &UiInputLimitsV1) -> Result<A2uiV1, DecodeA2uiV1ErrorV1> {
    if let Some(decode) = &limits.decode {
        if let Some(max_bytes) = decode.max_bytes {
            let observed = bytes.len() as u64;
            if observed > max_bytes {
                return Err(DecodeA2uiV1ErrorV1::LimitExceeded(limit_exceeded(
                    "decode.maxBytes",
                    max_bytes,
                    observed,
                )));
            }
        }
    }

    let value: Value = serde_json::from_slice(bytes).map_err(UiSpecError::from)?;

    if let Some(decode) = &limits.decode {
        if let Some(max_depth) = decode.max_depth {
            let observed = compute_max_depth(&value);
            if observed > max_depth {
                return Err(DecodeA2uiV1ErrorV1::LimitExceeded(limit_exceeded(
                    "decode.maxDepth",
                    max_depth,
                    observed,
                )));
            }
        }
        if let Some(max_string_length) = decode.max_string_length {
            let observed = compute_max_string_length(&value);
            if observed > max_string_length {
                return Err(DecodeA2uiV1ErrorV1::LimitExceeded(limit_exceeded(
                    "decode.maxStringLength",
                    max_string_length,
                    observed,
                )));
            }
        }
    }

    let payload: A2uiV1 = serde_json::from_value(value).map_err(UiSpecError::from)?;
    payload.validate()?;
    Ok(payload)
}

pub fn check_ui_v1_event_limits_v1(event: &UiV1CustomEvent, limits: &UiInputLimitsV1) -> Result<(), LimitExceededErrorV1> {
    let Some(ui_event) = &limits.ui_event else {
        return Ok(());
    };
    let Some(max_payload_keys) = ui_event.max_payload_keys else {
        return Ok(());
    };

    let observed = event.value.payload.len() as u64;
    if observed <= max_payload_keys {
        Ok(())
    } else {
        Err(limit_exceeded("uiEvent.maxPayloadKeys", max_payload_keys, observed))
    }
}

pub fn check_json_patch_limits_v1(delta: &[Value], limits: &UiInputLimitsV1) -> Result<(), LimitExceededErrorV1> {
    let Some(json_patch) = &limits.json_patch else {
        return Ok(());
    };
    if let Some(max_ops) = json_patch.max_ops {
        let observed = delta.len() as u64;
        if observed > max_ops {
            return Err(limit_exceeded("jsonPatch.maxOps", max_ops, observed));
        }
    }

    if let Some(prefixes) = &json_patch.allowed_path_prefixes {
        for op in delta {
            let Some(path) = op.get("path").and_then(Value::as_str) else {
                continue;
            };
            let ok = prefixes.iter().any(|p| path.starts_with(p));
            if !ok {
                let mut err = limit_exceeded("jsonPatch.allowedPathPrefixes", 0, 1);
                err.path = Some(path.to_string());
                return Err(err);
            }
        }
    }

    Ok(())
}

pub fn check_ui_state_limits_v1(shared_state: &Value, limits: &UiInputLimitsV1) -> Result<(), LimitExceededErrorV1> {
    let Some(ui_state) = &limits.ui_state else {
        return Ok(());
    };
    let Some(max_components) = ui_state.max_components else {
        return Ok(());
    };

    let observed = shared_state
        .get("ui")
        .and_then(|ui| ui.get("components"))
        .and_then(|c| c.as_object())
        .map(|c| c.len() as u64)
        .unwrap_or(0);

    if observed <= max_components {
        Ok(())
    } else {
        Err(limit_exceeded("uiState.maxComponents", max_components, observed))
    }
}

pub fn push_json_patch_op_v1(ops: &mut Vec<Value>, op: Value, limits: &UiInputLimitsV1) -> Result<(), LimitExceededErrorV1> {
    let Some(json_patch) = &limits.json_patch else {
        ops.push(op);
        return Ok(());
    };

    if let Some(max_ops) = json_patch.max_ops {
        let observed = (ops.len() + 1) as u64;
        if observed > max_ops {
            return Err(limit_exceeded("jsonPatch.maxOps", max_ops, observed));
        }
    }

    if let Some(prefixes) = &json_patch.allowed_path_prefixes {
        if let Some(path) = op.get("path").and_then(Value::as_str) {
            let ok = prefixes.iter().any(|p| path.starts_with(p));
            if !ok {
                let mut err = limit_exceeded("jsonPatch.allowedPathPrefixes", 0, 1);
                err.path = Some(path.to_string());
                return Err(err);
            }
        }
    }

    ops.push(op);
    Ok(())
}

pub fn parse_ui_input_limits_v1(bytes: &[u8]) -> Result<UiInputLimitsV1, UiSpecError> {
    let value: Value = serde_json::from_slice(bytes)?;
    let limits: UiInputLimitsV1 = serde_json::from_value(value)?;
    limits.validate()?;
    Ok(limits)
}
