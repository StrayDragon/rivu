mod ui_spec;
mod seq;
mod sse;
mod event_store;
mod snapshot_store;
mod resume;
mod ui_v1_event_processor;
mod state_ui_patch;
mod limits;
mod a2ui_bridge;

pub use ui_spec::{
    parse_a2ui_v1, parse_ui_data_ref_v1, parse_ui_dataset_v1, parse_ui_state_v1, parse_ui_v1_custom_event, reduce_envelopes_v1,
    parse_ui_v1_capabilities_custom_event, ui_v1_capabilities_choose_compatible, ui_v1_capabilities_is_supported,
    choose_viewer_chart_component_v1, A2uiMountV1, A2uiOpV1, A2uiV1, DecodeLimits, ReduceEnvelopeV1, ReduceGapV1, ReduceResultV1,
    UiComponentV1, UiDataRefV1, UiDatasetV1, UiMountV1, UiSpecError, UiStateV1, UiV1CapabilitiesChartFeaturesV1,
    UiV1CapabilitiesComponentRangeV1, UiV1CapabilitiesCustomEvent, UiV1CapabilitiesExportFeaturesV1, UiV1CapabilitiesFeaturesV1,
    UiV1CapabilitiesValueV1, UiV1CustomEvent, UiV1EventValue, UI_V1_CAPABILITIES_NAME, UI_V1_EVENT_NAME,
};

pub use seq::{SeqAllocator, SeqError};
pub use sse::{encode_sse_event, SseError};
pub use event_store::{Envelope, EventStoreError, InMemoryRingBufferEventStore, ReplayResult};
pub use snapshot_store::{Snapshot, SnapshotStoreError, SqliteSnapshotStore};
pub use resume::{resume_replay, ResumeError, ResumeKind, ResumeResult};
pub use ui_v1_event_processor::{AuthorizeHook, ProcessedResult, UiV1EventProcessor, UiV1EventProcessorError};

pub use state_ui_patch::{
    data_ref_v1, delete_component_v1, delete_dataset_v1, increment_component_revision_v1, mount_component_v1, set_component_props_v1,
    set_component_state_v1, set_component_v1, set_dataset_v1, unmount_component_v1,
};

pub use limits::{
    check_json_patch_limits_v1, check_ui_state_limits_v1, check_ui_v1_event_limits_v1, decode_a2ui_v1_with_limits_v1,
    decode_ui_v1_custom_event_with_limits_v1, DecodeA2uiV1ErrorV1, DecodeUiV1CustomEventErrorV1, LimitExceededErrorV1,
    parse_ui_input_limits_v1, push_json_patch_op_v1, UiInputDecodeLimitsV1, UiInputJsonPatchLimitsV1, UiInputLimitsV1,
    UiInputUiEventLimitsV1, UiInputUiStateLimitsV1,
};

pub use a2ui_bridge::{
    compile_a2ui_v1, A2uiWarningV1, CompileA2uiV1ErrorV1, CompileA2uiV1ResultV1, InMemoryKeyMapStore, KeyMapStore,
    KeyMapStoreError, SqliteKeyMapStore,
};
