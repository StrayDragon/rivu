use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::limits::push_json_patch_op_v1;
use crate::state_ui_patch::{
    delete_component_v1, increment_component_revision_v1, mount_component_v1, set_component_props_v1, set_component_state_v1,
    set_component_v1, unmount_component_v1,
};
use crate::ui_spec::{A2uiMountV1, A2uiOpV1, A2uiV1, UiComponentV1, UiMountV1};
use crate::{LimitExceededErrorV1, UiInputLimitsV1, UiSpecError};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct A2uiWarningV1 {
    pub code: String,
    pub message: String,
    pub op_index: u64,
    pub key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CompileA2uiV1ResultV1 {
    pub patch_ops: Vec<Value>,
    pub created_component_ids: Vec<String>,
    pub warnings: Vec<A2uiWarningV1>,
}

#[derive(thiserror::Error, Debug)]
pub enum CompileA2uiV1ErrorV1 {
    #[error(transparent)]
    Spec(#[from] UiSpecError),
    #[error(transparent)]
    KeyMap(#[from] KeyMapStoreError),
    #[error("limit exceeded")]
    LimitExceeded(LimitExceededErrorV1),
}

#[derive(thiserror::Error, Debug)]
pub enum KeyMapStoreError {
    #[error("thread_id must be non-empty")]
    EmptyThreadId,
    #[error("key must be non-empty")]
    EmptyKey,
    #[error("component_id must be non-empty")]
    EmptyComponentId,
    #[error("sqlite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

pub trait KeyMapStore: Send + Sync {
    fn get(&self, thread_id: &str, key: &str) -> Result<Option<String>, KeyMapStoreError>;
    fn set(&self, thread_id: &str, key: &str, component_id: &str) -> Result<(), KeyMapStoreError>;
    fn delete(&self, thread_id: &str, key: &str) -> Result<(), KeyMapStoreError>;
    fn list(&self, thread_id: &str) -> Result<BTreeMap<String, String>, KeyMapStoreError>;
}

#[derive(Debug, Default)]
pub struct InMemoryKeyMapStore {
    inner: Mutex<HashMap<String, BTreeMap<String, String>>>,
}

impl InMemoryKeyMapStore {
    pub fn new() -> Self {
        Self::default()
    }
}

impl KeyMapStore for InMemoryKeyMapStore {
    fn get(&self, thread_id: &str, key: &str) -> Result<Option<String>, KeyMapStoreError> {
        if thread_id.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyThreadId);
        }
        if key.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyKey);
        }
        Ok(self
            .inner
            .lock()
            .expect("key map lock")
            .get(thread_id)
            .and_then(|m| m.get(key))
            .cloned())
    }

    fn set(&self, thread_id: &str, key: &str, component_id: &str) -> Result<(), KeyMapStoreError> {
        if thread_id.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyThreadId);
        }
        if key.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyKey);
        }
        if component_id.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyComponentId);
        }
        let mut guard = self.inner.lock().expect("key map lock");
        guard
            .entry(thread_id.to_string())
            .or_default()
            .insert(key.to_string(), component_id.to_string());
        Ok(())
    }

    fn delete(&self, thread_id: &str, key: &str) -> Result<(), KeyMapStoreError> {
        if thread_id.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyThreadId);
        }
        if key.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyKey);
        }
        let mut guard = self.inner.lock().expect("key map lock");
        let Some(map) = guard.get_mut(thread_id) else {
            return Ok(());
        };
        map.remove(key);
        if map.is_empty() {
            guard.remove(thread_id);
        }
        Ok(())
    }

    fn list(&self, thread_id: &str) -> Result<BTreeMap<String, String>, KeyMapStoreError> {
        if thread_id.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyThreadId);
        }
        Ok(self
            .inner
            .lock()
            .expect("key map lock")
            .get(thread_id)
            .cloned()
            .unwrap_or_default())
    }
}

#[derive(Debug, Clone)]
pub struct SqliteKeyMapStore {
    path: PathBuf,
}

impl SqliteKeyMapStore {
    pub fn new(path: impl Into<PathBuf>) -> Result<Self, KeyMapStoreError> {
        let path = path.into();
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent)?;
            }
        }
        let store = Self { path };
        store.init_db()?;
        Ok(store)
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    fn open(&self) -> Result<Connection, KeyMapStoreError> {
        let conn = Connection::open(&self.path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        Ok(conn)
    }

    fn init_db(&self) -> Result<(), KeyMapStoreError> {
        let conn = self.open()?;
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS rivu_key_map (
              thread_id TEXT NOT NULL,
              key TEXT NOT NULL,
              component_id TEXT NOT NULL,
              PRIMARY KEY(thread_id, key)
            );
            CREATE INDEX IF NOT EXISTS idx_rivu_key_map_thread ON rivu_key_map(thread_id);
            "#,
        )?;
        Ok(())
    }
}

impl KeyMapStore for SqliteKeyMapStore {
    fn get(&self, thread_id: &str, key: &str) -> Result<Option<String>, KeyMapStoreError> {
        if thread_id.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyThreadId);
        }
        if key.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyKey);
        }
        let conn = self.open()?;
        let mut stmt = conn.prepare("SELECT component_id FROM rivu_key_map WHERE thread_id=? AND key=?")?;
        let row: Option<String> = stmt
            .query_row(params![thread_id, key], |row| row.get(0))
            .optional()?;
        Ok(row)
    }

    fn set(&self, thread_id: &str, key: &str, component_id: &str) -> Result<(), KeyMapStoreError> {
        if thread_id.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyThreadId);
        }
        if key.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyKey);
        }
        if component_id.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyComponentId);
        }
        let conn = self.open()?;
        conn.execute(
            "INSERT OR REPLACE INTO rivu_key_map(thread_id, key, component_id) VALUES (?,?,?)",
            params![thread_id, key, component_id],
        )?;
        Ok(())
    }

    fn delete(&self, thread_id: &str, key: &str) -> Result<(), KeyMapStoreError> {
        if thread_id.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyThreadId);
        }
        if key.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyKey);
        }
        let conn = self.open()?;
        conn.execute("DELETE FROM rivu_key_map WHERE thread_id=? AND key=?", params![thread_id, key])?;
        Ok(())
    }

    fn list(&self, thread_id: &str) -> Result<BTreeMap<String, String>, KeyMapStoreError> {
        if thread_id.trim().is_empty() {
            return Err(KeyMapStoreError::EmptyThreadId);
        }
        let conn = self.open()?;
        let mut stmt = conn.prepare("SELECT key, component_id FROM rivu_key_map WHERE thread_id=? ORDER BY key ASC")?;
        let rows = stmt.query_map(params![thread_id], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?;
        let mut out = BTreeMap::new();
        for row in rows {
            let (key, component_id) = row?;
            out.insert(key, component_id);
        }
        Ok(out)
    }
}

fn default_component_id_for_key(key: &str) -> String {
    format!("cmp_{}", key)
}

fn select_ui_component(shared_state: &Value, component_id: &str) -> Option<UiComponentV1> {
    let raw = shared_state
        .get("ui")
        .and_then(|ui| ui.get("components"))
        .and_then(|c| c.get(component_id))?;
    serde_json::from_value(raw.clone()).ok()
}

fn push_op(ops: &mut Vec<Value>, op: Value, limits: Option<&UiInputLimitsV1>) -> Result<(), CompileA2uiV1ErrorV1> {
    if let Some(limits) = limits {
        push_json_patch_op_v1(ops, op, limits).map_err(CompileA2uiV1ErrorV1::LimitExceeded)?;
        return Ok(());
    }
    ops.push(op);
    Ok(())
}

fn push_all(ops: &mut Vec<Value>, next: Vec<Value>, limits: Option<&UiInputLimitsV1>) -> Result<(), CompileA2uiV1ErrorV1> {
    for op in next {
        push_op(ops, op, limits)?;
    }
    Ok(())
}

fn warning(code: &str, message: String, op_index: usize, key: &str) -> A2uiWarningV1 {
    A2uiWarningV1 {
        code: code.into(),
        message,
        op_index: op_index as u64,
        key: key.into(),
    }
}

fn mount_order(mount: &A2uiMountV1) -> i64 {
    mount.order.unwrap_or(0)
}

pub fn compile_a2ui_v1(
    shared_state: &Value,
    payload: &A2uiV1,
    thread_id: &str,
    key_map_store: &dyn KeyMapStore,
    limits: Option<&UiInputLimitsV1>,
) -> Result<CompileA2uiV1ResultV1, CompileA2uiV1ErrorV1> {
    if thread_id.trim().is_empty() {
        return Err(UiSpecError::ValidationError("threadId must be non-empty".into()).into());
    }

    let mut patch_ops: Vec<Value> = vec![];
    let mut created_component_ids: Vec<String> = vec![];
    let mut warnings: Vec<A2uiWarningV1> = vec![];

    for (i, op) in payload.ops.iter().enumerate() {
        match op {
            A2uiOpV1::Create {
                key,
                component_type,
                schema_version,
                props,
                state,
                mount,
            } => {
                let existing = key_map_store.get(thread_id, key)?;
                if existing.is_some() {
                    warnings.push(warning("KEY_ALREADY_EXISTS", format!("key already exists: {}", key), i, key));
                    continue;
                }

                let component_id = default_component_id_for_key(key);
                if select_ui_component(shared_state, &component_id).is_some() {
                    warnings.push(warning(
                        "COMPONENT_ID_COLLISION",
                        format!("componentId already exists: {}", component_id),
                        i,
                        key,
                    ));
                    continue;
                }

                let mut component = Map::new();
                component.insert("type".into(), Value::String(component_type.clone()));
                component.insert("schemaVersion".into(), Value::Number((*schema_version).into()));
                component.insert("props".into(), Value::Object(props.clone()));
                component.insert("revision".into(), Value::Number(0.into()));
                component.insert("mounts".into(), Value::Array(vec![]));
                if let Some(state) = state {
                    component.insert("state".into(), Value::Object(state.clone()));
                }

                push_all(
                    &mut patch_ops,
                    set_component_v1(&component_id, Value::Object(component)),
                    limits,
                )?;
                key_map_store.set(thread_id, key, &component_id)?;
                created_component_ids.push(component_id.clone());

                if let Some(mount) = mount {
                    push_all(
                        &mut patch_ops,
                        mount_component_v1(&component_id, &mount.message_id, &mount.slot, mount_order(mount)),
                        limits,
                    )?;
                }
            }
            A2uiOpV1::Update { key, props, state } => {
                let Some(component_id) = key_map_store.get(thread_id, key)? else {
                    warnings.push(warning("UNKNOWN_KEY", format!("unknown key: {}", key), i, key));
                    continue;
                };

                let Some(component) = select_ui_component(shared_state, &component_id) else {
                    warnings.push(warning(
                        "COMPONENT_NOT_FOUND",
                        format!("component not found: {}", component_id),
                        i,
                        key,
                    ));
                    continue;
                };

                if let Some(props) = props {
                    push_all(
                        &mut patch_ops,
                        set_component_props_v1(&component_id, Value::Object(props.clone())),
                        limits,
                    )?;
                }
                if let Some(state) = state {
                    push_all(
                        &mut patch_ops,
                        set_component_state_v1(&component_id, Value::Object(state.clone())),
                        limits,
                    )?;
                }
                push_all(
                    &mut patch_ops,
                    increment_component_revision_v1(&component_id, component.revision),
                    limits,
                )?;
            }
            A2uiOpV1::Mount {
                key,
                message_id,
                slot,
                order,
            } => {
                let Some(component_id) = key_map_store.get(thread_id, key)? else {
                    warnings.push(warning("UNKNOWN_KEY", format!("unknown key: {}", key), i, key));
                    continue;
                };

                let Some(component) = select_ui_component(shared_state, &component_id) else {
                    warnings.push(warning(
                        "COMPONENT_NOT_FOUND",
                        format!("component not found: {}", component_id),
                        i,
                        key,
                    ));
                    continue;
                };

                let mounts: Vec<UiMountV1> = component.mounts.clone();
                push_all(
                    &mut patch_ops,
                    unmount_component_v1(&mounts, &component_id, message_id, slot),
                    limits,
                )?;
                push_all(
                    &mut patch_ops,
                    mount_component_v1(&component_id, message_id, slot, order.unwrap_or(0)),
                    limits,
                )?;
            }
            A2uiOpV1::Unmount { key, message_id, slot } => {
                let Some(component_id) = key_map_store.get(thread_id, key)? else {
                    warnings.push(warning("UNKNOWN_KEY", format!("unknown key: {}", key), i, key));
                    continue;
                };

                let Some(component) = select_ui_component(shared_state, &component_id) else {
                    warnings.push(warning(
                        "COMPONENT_NOT_FOUND",
                        format!("component not found: {}", component_id),
                        i,
                        key,
                    ));
                    continue;
                };

                let mounts: Vec<UiMountV1> = component.mounts.clone();
                push_all(
                    &mut patch_ops,
                    unmount_component_v1(&mounts, &component_id, message_id, slot),
                    limits,
                )?;
            }
            A2uiOpV1::Remove { key } => {
                let Some(component_id) = key_map_store.get(thread_id, key)? else {
                    warnings.push(warning("UNKNOWN_KEY", format!("unknown key: {}", key), i, key));
                    continue;
                };

                let delta = delete_component_v1(shared_state, &component_id)?;
                push_all(&mut patch_ops, delta, limits)?;
                key_map_store.delete(thread_id, key)?;
            }
        }
    }

    Ok(CompileA2uiV1ResultV1 {
        patch_ops,
        created_component_ids,
        warnings,
    })
}
