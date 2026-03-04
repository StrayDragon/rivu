use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snapshot {
    pub thread_id: String,
    pub seq: u64,
    pub shared_state: Value,
    pub created_at_ms: i64,
}

#[derive(thiserror::Error, Debug)]
pub enum SnapshotStoreError {
    #[error("thread_id must be non-empty")]
    EmptyThreadId,
    #[error("seq must be a positive integer")]
    InvalidSeq,
    #[error("snapshot must be a json object")]
    SnapshotNotObject,
    #[error("sqlite error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Clone)]
pub struct SqliteSnapshotStore {
    path: PathBuf,
}

impl SqliteSnapshotStore {
    pub fn new(path: impl Into<PathBuf>) -> Result<Self, SnapshotStoreError> {
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

    fn open(&self) -> Result<Connection, SnapshotStoreError> {
        let conn = Connection::open(&self.path)?;
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;
        Ok(conn)
    }

    fn init_db(&self) -> Result<(), SnapshotStoreError> {
        let conn = self.open()?;
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS rivu_snapshots (
              thread_id TEXT NOT NULL,
              seq INTEGER NOT NULL,
              snapshot_json TEXT NOT NULL,
              created_at_ms INTEGER NOT NULL,
              PRIMARY KEY(thread_id, seq)
            );
            CREATE INDEX IF NOT EXISTS idx_rivu_snapshots_thread_seq ON rivu_snapshots(thread_id, seq);
            "#,
        )?;
        Ok(())
    }

    pub fn put(&self, thread_id: &str, seq: u64, shared_state: &Value) -> Result<(), SnapshotStoreError> {
        if thread_id.trim().is_empty() {
            return Err(SnapshotStoreError::EmptyThreadId);
        }
        if seq == 0 {
            return Err(SnapshotStoreError::InvalidSeq);
        }
        if !shared_state.is_object() {
            return Err(SnapshotStoreError::SnapshotNotObject);
        }

        let created_at_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;
        let payload = serde_json::to_string(shared_state)?;

        let conn = self.open()?;
        conn.execute(
            "INSERT OR REPLACE INTO rivu_snapshots(thread_id, seq, snapshot_json, created_at_ms) VALUES (?,?,?,?)",
            params![thread_id, seq as i64, payload, created_at_ms],
        )?;
        Ok(())
    }

    pub fn get_latest(&self, thread_id: &str) -> Result<Option<Snapshot>, SnapshotStoreError> {
        if thread_id.trim().is_empty() {
            return Err(SnapshotStoreError::EmptyThreadId);
        }
        let conn = self.open()?;
        let mut stmt = conn.prepare(
            "SELECT seq, snapshot_json, created_at_ms FROM rivu_snapshots WHERE thread_id=? ORDER BY seq DESC LIMIT 1",
        )?;
        let row = stmt
            .query_row(params![thread_id], |row| {
                let seq: i64 = row.get(0)?;
                let snapshot_json: String = row.get(1)?;
                let created_at_ms: i64 = row.get(2)?;
                Ok((seq, snapshot_json, created_at_ms))
            })
            .optional()?;

        match row {
            None => Ok(None),
            Some((seq, json, created_at_ms)) => {
                let shared_state: Value = serde_json::from_str(&json)?;
                if !shared_state.is_object() {
                    return Err(SnapshotStoreError::SnapshotNotObject);
                }
                Ok(Some(Snapshot {
                    thread_id: thread_id.to_string(),
                    seq: seq as u64,
                    shared_state,
                    created_at_ms,
                }))
            }
        }
    }
}
