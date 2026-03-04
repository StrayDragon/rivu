mod ui_spec;
mod seq;
mod sse;
mod event_store;
mod snapshot_store;
mod resume;
mod ui_v1_event_processor;
mod state_ui_patch;

pub use ui_spec::{
    parse_ui_state_v1, parse_ui_v1_custom_event, reduce_envelopes_v1, DecodeLimits, ReduceEnvelopeV1,
    ReduceGapV1, ReduceResultV1, UiComponentV1, UiMountV1, UiSpecError, UiStateV1, UiV1CustomEvent,
    UiV1EventValue, UI_V1_EVENT_NAME,
};

pub use seq::{SeqAllocator, SeqError};
pub use sse::{encode_sse_event, SseError};
pub use event_store::{Envelope, EventStoreError, InMemoryRingBufferEventStore, ReplayResult};
pub use snapshot_store::{Snapshot, SnapshotStoreError, SqliteSnapshotStore};
pub use resume::{resume_replay, ResumeError, ResumeKind, ResumeResult};
pub use ui_v1_event_processor::{AuthorizeHook, ProcessedResult, UiV1EventProcessor, UiV1EventProcessorError};

pub use state_ui_patch::{
    increment_component_revision_v1, mount_component_v1, set_component_props_v1, set_component_state_v1, set_component_v1,
    unmount_component_v1,
};
