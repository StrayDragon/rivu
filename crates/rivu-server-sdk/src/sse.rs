use serde::Serialize;

#[derive(thiserror::Error, Debug)]
pub enum SseError {
    #[error("seq must be a positive integer")]
    InvalidSeq,
    #[error("json encode error: {0}")]
    JsonEncode(#[from] serde_json::Error),
}

pub fn encode_sse_event<T: Serialize>(seq: u64, event: &T) -> Result<String, SseError> {
    if seq == 0 {
        return Err(SseError::InvalidSeq);
    }
    let data = serde_json::to_string(event)?;
    Ok(format!("id: {}\ndata: {}\n\n", seq, data))
}

