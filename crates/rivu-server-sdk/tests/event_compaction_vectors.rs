use std::collections::BTreeMap;
use std::path::Path;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Envelope {
    seq: u64,
    event: Value,
}

fn apply_patch_minimal(doc: &mut Value, delta: &[Value]) {
    for item in delta {
        let op = item.as_object().expect("patch op object");
        let kind = op.get("op").and_then(Value::as_str).unwrap_or("");
        let path = op.get("path").and_then(Value::as_str).unwrap_or("");

        if !path.starts_with('/') {
            panic!("unsupported patch path: {path}");
        }
        let key = path.trim_start_matches('/');
        if key.contains('/') {
            panic!("unsupported nested patch path: {path}");
        }

        match kind {
            "add" | "replace" => {
                let value = op.get("value").cloned().unwrap_or(Value::Null);
                let obj = doc.as_object_mut().expect("doc object");
                obj.insert(key.to_string(), value);
            }
            "remove" => {
                let obj = doc.as_object_mut().expect("doc object");
                obj.remove(key);
            }
            other => panic!("unsupported patch op: {other}"),
        }
    }
}

fn reduce_for_compaction(envelopes: &[Envelope]) -> Value {
    let mut sorted = envelopes.to_vec();
    sorted.sort_by_key(|e| e.seq);

    let mut last_seq: u64 = 0;
    let mut shared_state: Value = json!({});
    let mut messages: BTreeMap<String, (String, String)> = BTreeMap::new(); // id -> (role, content)
    let mut tool_calls: BTreeMap<String, (String, Option<String>, String)> = BTreeMap::new(); // id -> (name, parent, args)

    for env in sorted {
        if env.seq <= last_seq {
            continue;
        }
        last_seq = env.seq;

        let event_type = env.event.get("type").and_then(Value::as_str).unwrap_or("");
        match event_type {
            "STATE_SNAPSHOT" => {
                let snapshot = env.event.get("snapshot").cloned().unwrap_or(Value::Null);
                assert!(snapshot.is_object(), "STATE_SNAPSHOT.snapshot must be an object");
                shared_state = snapshot;
            }
            "STATE_DELTA" => {
                let delta = env.event.get("delta").and_then(Value::as_array).cloned().unwrap_or_default();
                assert!(shared_state.is_object(), "shared_state must be an object");
                apply_patch_minimal(&mut shared_state, &delta);
            }
            "TEXT_MESSAGE_CHUNK" => {
                let message_id = env.event.get("messageId").and_then(Value::as_str).unwrap_or("").trim();
                if message_id.is_empty() {
                    continue;
                }
                let role = env
                    .event
                    .get("role")
                    .and_then(Value::as_str)
                    .unwrap_or("assistant")
                    .to_string();
                let delta = env.event.get("delta").and_then(Value::as_str).unwrap_or("");

                let entry = messages.entry(message_id.to_string()).or_insert_with(|| (role, String::new()));
                entry.1.push_str(delta);
            }
            "TOOL_CALL_CHUNK" => {
                let tool_call_id = env.event.get("toolCallId").and_then(Value::as_str).unwrap_or("").trim();
                if tool_call_id.is_empty() {
                    continue;
                }
                let name = env
                    .event
                    .get("toolCallName")
                    .and_then(Value::as_str)
                    .unwrap_or("")
                    .to_string();
                let parent = env.event.get("parentMessageId").and_then(Value::as_str).map(|s| s.to_string());
                let delta = env.event.get("delta").and_then(Value::as_str).unwrap_or("");

                let entry = tool_calls
                    .entry(tool_call_id.to_string())
                    .or_insert_with(|| (name.clone(), parent.clone(), String::new()));
                if entry.0.is_empty() {
                    entry.0 = name;
                }
                if entry.1.is_none() {
                    entry.1 = parent;
                }
                entry.2.push_str(delta);
            }
            _ => {}
        }
    }

    let messages_out: Vec<Value> = messages
        .into_iter()
        .map(|(id, (role, content))| json!({ "id": id, "role": role, "content": content }))
        .collect();

    let tool_calls_out: Vec<Value> = tool_calls
        .into_iter()
        .map(|(id, (name, parent, args))| json!({ "id": id, "name": name, "parentMessageId": parent, "args": args }))
        .collect();

    json!({
      "sharedState": shared_state,
      "messages": messages_out,
      "toolCalls": tool_calls_out,
    })
}

#[test]
fn vectors_event_compaction_reduce_equivalence() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/event-compaction.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: Value = serde_json::from_str(&raw).expect("parse vectors json");
    assert_eq!(vectors["version"], 1);

    let cases = vectors["eventCompaction"].as_array().expect("eventCompaction cases array");
    for case in cases {
        let id = case["id"].as_str().unwrap_or("<unknown>");

        let input_envs_value = case["input"]["envelopes"].clone();
        let expect_envs_value = case["expect"]["envelopes"].clone();
        let expected_derived = case["expect"]["derived"].clone();

        let input_envs: Vec<Envelope> = serde_json::from_value(input_envs_value).expect("parse input envelopes");
        let compacted_envs: Vec<Envelope> = serde_json::from_value(expect_envs_value).expect("parse compacted envelopes");

        let reduced_input = reduce_for_compaction(&input_envs);
        let reduced_compacted = reduce_for_compaction(&compacted_envs);
        assert_eq!(reduced_input, expected_derived, "case {} reduce(input)", id);
        assert_eq!(reduced_compacted, expected_derived, "case {} reduce(compacted)", id);
    }
}
