# Integration Guide (Kernel + Registry)

Rivu is designed for **progressive adoption**. You can stop at any level.

For the canonical "first integration" baseline (SSE/WS envelopes, `resumeFrom`, and rendering mounts from `sharedState.ui`), start with:
- `docs/integration-quickstart.md`

## Adoption Ladder

### Level 0 — Spec only

Use `rivu-ui-spec` to validate:

- `CUSTOM(name="ui.v1.event")`
- `sharedState.ui` (`state.ui` in PRD)
- golden vectors for cross-language consistency

### Level 1 — Kernel only (no UI components)

`rivu-kernel` consumes `{ seq, event }` envelopes and produces derived state:

- strict `seq` ordering (`lastSeq`, duplicates dropped, gaps → `needsResync`)
- shared state merge (`STATE_SNAPSHOT` replace, `STATE_DELTA` JSON Patch)
- selectors for `sharedState.ui`
- outbox for sending `ui.v1.event` (idempotent by `clientRequestId`)

### Level 2 — Render Primitives + UI kit

Use:

- `ComponentRenderer` + registry (`rivu-react`)
- Svelte store + resolver primitives (`rivu-svelte`)
- Viewer/Workflow MVP components (exported by `rivu-react`)

## Kernel API

```ts
import { createKernel } from 'rivu-kernel';

const kernel = createKernel({
  actionTransport: async (action) => {
    // POST ui.v1.event to your backend
  },
});

kernel.dispatch({ seq, event });   // server envelopes
kernel.send(uiV1CustomEvent);      // client actions (ui.v1.event)
kernel.getState();                 // lastSeq, sharedState, messages, toolCalls, outbox…
kernel.subscribe(() => { /* rerender */ });
```

### `seq` rules (fail-fast)

- `seq == lastSeq + 1` → apply
- `seq <= lastSeq` → discard (duplicate/outdated)
- `seq > lastSeq + 1` → **gap** → kernel sets `needsResync`

**Kernel does not fetch data.** Your transport layer must resync (replay or snapshot).

## `sharedState.ui` rendering

`sharedState.ui` contains:

- `components[componentId] = { type, schemaVersion, props, state?, revision, mounts[], status?, error? }`
- `mounts[] = { messageId, slot, order }` for placement

Kernel selectors:

```ts
import { selectMountedUiComponentsV1 } from 'rivu-kernel';

const mounted = selectMountedUiComponentsV1({
  state: kernel.getState(),
  messageId: 'msg_123',
  slot: 'inline',
});
```

## React: registry + `ComponentRenderer`

### Registry

```ts
import { createRegistry, viewerRegistryV1, workflowRegistryV1 } from 'rivu-react';

const registry = createRegistry({
  ...viewerRegistryV1,
  ...workflowRegistryV1,
  // plus app components…
});
```

Each registration is a whitelist entry:

- `schemaVersion` must match `sharedState.ui.components[componentId].schemaVersion`
- `propsSchema/stateSchema` validate the server-owned data
- `render(...)` must be pure rendering (no tool execution in browser)

### Capabilities handshake (`ui.v1.capabilities`) (recommended)

If your host can vary the registry (custom components, trimmed UI kit, multi-framework deployments), have the client report what it can render.

When to send:
- Once on connection established / before the first request.
- Re-send whenever registry/features change (e.g. app upgrade), or periodically (TTL) if your server caches per session.

React helper:

```ts
import { buildUiV1Capabilities } from 'rivu-react';

const capabilitiesEvent = {
  type: 'CUSTOM',
  name: 'ui.v1.capabilities',
  value: {
    ...buildUiV1Capabilities(registry, {
      // optional overrides/extensions
      export: { formats: ['json'] },
    }),
    client: { framework: 'react', runtime: 'web' },
  },
};
```

Svelte helper: `buildUiV1Capabilities` is also exported by `rivu-svelte`.

Server-side guidance:
- Treat capabilities as a hint, not a security boundary.
- Prefer the highest supported `schemaVersion` for a `componentType`.
- Downgrade deterministically when unsupported (e.g. `Chart` → `BarChart`/`LineChart`).
- If `features.datasets = false`, prefer conservative output (inline data instead of `dataRef`).
- Unknown `features.*` keys must be ignored (forward-compatible).

SDK helpers:
- Python: `decode_ui_v1_capabilities_with_limits_v1`, `is_supported`, `choose_compatible`
- Rust: `parse_ui_v1_capabilities_custom_event`, `ui_v1_capabilities_is_supported`, `ui_v1_capabilities_choose_compatible`

Missing / stale capabilities:
- Server must still work with conservative output.
- Client must always degrade safely via `UnknownComponentCard` (never crash).

### Rendering

```tsx
import { ComponentRenderer } from 'rivu-react';

<ComponentRenderer kernel={kernel} registry={registry} componentId="cmp_123" />
```

Provider is optional (sugar only): `RivuProvider`.

## Svelte: readable store + resolver

Use `kernelStore(kernel)` to get `Readable<RivuKernelState>`, then either:

- `resolveUiComponentV1({ state: $kernel, registry, componentId })`
- or `componentRendererStore({ kernel, registry, componentId })` for a derived readable result

## Component lifecycle (building / ready / error)

`sharedState.ui.components[componentId]` MAY include:

- `status?: "building" | "ready" | "error"` (missing defaults to `"ready"`)
- `error?: { code: string, message: string, details?: object }` (only meaningful when `status="error"`)

Guidance:
- `building`: use when you want to mount a component early and stream patches later; the renderer shows a skeleton and does not require props/state to be complete yet.
- `ready`: the normal state; the renderer strictly validates props/state against the registered schemas. Invalid data falls back to `UnknownComponentCard`.
- `error`: use when component generation/validation/patching fails; the renderer shows a viewer-safe ErrorCard.

Security note for `error`:
- Keep `error.code/message` concise and **viewer-safe**.
- Avoid secrets/PII in `error.details`; in production it should usually be omitted.

## UnknownComponent strategy

Unknown/invalid components must **never crash the page**.

Resolution priority is (highest → lowest):

1) unknown: component not found / type not registered / schemaVersion mismatch / (when `status="ready"`) props/state validation fails → `UnknownComponentCard`
2) error: `status="error"` → `ComponentErrorCard`
3) building: `status="building"` → `ComponentSkeleton`
4) ready: `status` missing or `"ready"` → normal render

`ComponentRenderer` falls back to `UnknownComponentCard` when:

- component not found
- component type not registered
- schemaVersion mismatch
- props/state validation fails (only in `ready`)

In production, treat UnknownComponent as a **viewer-safe** fallback (show type/version and raw JSON summary).

## Component catalog (v1 MVP)

All component data is **server-owned** inside `sharedState.ui.components[componentId]`.

### Viewer (stateless, replayable)

Import:

- `viewerRegistryV1` from `rivu-react`

Component types:

- `ReportSection` (`schemaVersion: 1`) — props: `{ title, description? }`
- `MetricCard` (`schemaVersion: 1`) — props: `{ label, value, unit?, changePercent?, note? }`
- `DataTable` (`schemaVersion: 1`) — props: `{ caption?, columns[], rows[] }`
- `Chart` (`schemaVersion: 1`) — props: `{ mark, data:{ columns[], rows[] }, encoding, options? }` (recommended, token-efficient)
- `BarChart` (`schemaVersion: 1`) — props: `{ title?, unit?, items[] }`
- `LineChart` (`schemaVersion: 1`) — props: `{ title?, unit?, points[] }`
- `CitationList` (`schemaVersion: 1`) — props: `{ title?, items[] }` (unsafe/invalid URLs are blocked)

Notes:
- Prefer `Chart` for new integrations and A2UI generation. `BarChart` / `LineChart` remain as compatibility components for existing snapshots.
- `Chart.data` uses `columns + rows` to reduce repeated keys. Keep `columns` short and map fields explicitly via `encoding` for validation and replay.

Minimal `Chart` example:

```json
{
  "type": "Chart",
  "schemaVersion": 1,
  "props": {
    "mark": "bar",
    "data": { "columns": ["channel", "revenue"], "rows": [["Search", 34200], ["Email", 9400]] },
    "encoding": { "x": "channel", "y": "revenue" },
    "options": { "title": "Revenue by channel", "unit": "USD" }
  }
}
```

Example `sharedState.ui` component entry:

```json
{
  "type": "MetricCard",
  "schemaVersion": 1,
  "props": { "label": "Revenue", "value": 1234, "unit": "USD" },
  "revision": 0,
  "mounts": [{ "messageId": "msg_1", "slot": "inline", "order": 0 }]
}
```

### Workflow (stateful, round-trip)

Import:

- `workflowRegistryV1` from `rivu-react`

Component types:

- `ApprovalCard` (`schemaVersion: 1`)
  - props: `{ title, description?, approveLabel?, denyLabel? }`
  - state: `{ status: "pending"|"approved"|"denied", disabled?, decidedAtMs?, decidedBy?, message? }`
  - events: `approve`, `deny` (payload `{}`)
- `FormCard` (`schemaVersion: 1`)
  - props: `{ title, description?, submitLabel?, fields[] }`
  - state: `{ values, errors?, disabled?, status? }`
  - events:
    - `setField` payload `{ fieldId, value }`
    - `submit` payload `{ values }`

## Workflow components (server-authoritative)

Stateful components must:

- send `CUSTOM(name="ui.v1.event")`
- include `clientRequestId` (frontend-generated) and `baseRevision` (server revision)
- never “commit” state locally without a server `STATE_DELTA/STATE_SNAPSHOT`

See:

- Python: `python/src/rivu_server_sdk/ui_v1_event_processor.py`
- Rust: `crates/rivu-server-sdk/src/ui_v1_event_processor.rs`

## Server SDK (Python/Rust) quickstart

See also:
- `docs/event-compaction.md` (server-side flush/compaction + snapshot tuning)

### Resume path (ring-buffer → snapshot fallback)

The recommended server pattern is:

1) allocate `seq` per thread
2) append envelopes to an in-memory ring-buffer (short resume window)
3) persist snapshots to SQLite (refresh/restart recovery)
4) on reconnect, call `resume_replay(...)` — replay if possible, else send a `STATE_SNAPSHOT`

Python (outline):

```py
from rivu_server_sdk import (
  SeqAllocator, InMemoryRingBufferEventStore, SqliteSnapshotStore,
  resume_replay, encode_sse_event
)

alloc = SeqAllocator()
events = InMemoryRingBufferEventStore(capacity_per_thread=20_000)
snaps = SqliteSnapshotStore("rivu.snapshots.db")

# on reconnect:
result = resume_replay(
  thread_id="th_1",
  resume_from=123,
  event_store=events,
  snapshot_store=snaps,
  seq_allocator=alloc,
)
for env in result.envelopes:
  print(encode_sse_event(seq=env["seq"], event=env["event"]))
```

Rust (outline):

```rust
use rivu_server_sdk::{SeqAllocator, InMemoryRingBufferEventStore, SqliteSnapshotStore, resume_replay, encode_sse_event};
use serde_json::json;

let alloc = SeqAllocator::default();
let events = InMemoryRingBufferEventStore::new(20_000);
let snaps = SqliteSnapshotStore::new("rivu.snapshots.db").unwrap();

let result = resume_replay("th_1", 123, &events, &snaps, Some(&alloc)).unwrap();
for env in result.envelopes {
  let line = encode_sse_event(env.seq, &env.event).unwrap();
  println!("{line}");
}
```

### Processing `ui.v1.event` (idempotency + revision)

Both SDKs include a minimal `UiV1EventProcessor` that:

- enforces idempotency via `clientRequestId`
- rejects revision conflicts (`baseRevision` vs component `revision`)
- outputs an AG-UI `STATE_DELTA` to update `sharedState.ui.components[componentId].state/revision`

Supported component types in the processor (MVP):

- `ApprovalCard` (`approve` / `deny`)
- `Chart` (`chart.setSelection` / `chart.clearSelection`)
- `FormCard` (`setField` / `submit`)

#### Chart interactions (`chart-interactions` v1)

When `component.type="Chart"` is used in a **workflow** role (server-authoritative `state` + `revision`), the SDK processors and UI kits support a minimal interaction loop via `CUSTOM(name="ui.v1.event")`:

- `eventName="chart.setSelection"` — update `component.state.selection`
- `eventName="chart.clearSelection"` — clear selection (`kind: "none"`)

Payload shapes (examples):

```json
{ "selection": { "kind": "point", "rowIndex": 3 } }
```

```json
{ "selection": { "kind": "range", "column": "x", "from": 1, "to": 7 } }
```

```json
{ "selection": { "kind": "series", "value": "A" } }
```

```json
{ "selection": { "kind": "none" } }
```

Selection state shape:

- `sharedState.ui.components[componentId].state.selection` mirrors the `selection` object in `chart.setSelection`.
- On each accepted event, the server increments `sharedState.ui.components[componentId].revision`.
- The client MUST send `baseRevision` equal to the current component `revision` to avoid conflicts.

Token efficiency tips:

- Do **not** duplicate rows/datum JSON in the event payload; prefer lightweight references like `rowIndex` / `range` / `series`.
- Keep payload stable and minimal so the same processor can be reused across hosts.

### Building `sharedState.ui` patches (mount/props/state/revision)

Both SDKs provide small JSON Patch builder helpers for common `sharedState.ui` updates.

Python (minimal end-to-end snippet):

```py
from rivu_server_sdk import (
  set_component_v1, mount_component_v1,
  set_component_state_v1, increment_component_revision_v1,
)

component_id = "cmp_form_1"

# 1) Ensure the component exists under sharedState.ui.components
component = {
  "type": "FormCard",
  "schemaVersion": 1,
  "props": { "title": "Demo form", "fields": [] },
  "state": { "status": "pending" },
  "revision": 0,
  "mounts": [],
}

patch = []
patch += set_component_v1(component_id=component_id, component=component)

# 2) Mount it into a message slot
patch += mount_component_v1(component_id=component_id, message_id="msg_1", slot="inline", order=0)

# 3) Update server-authoritative state + bump revision
patch += set_component_state_v1(component_id=component_id, state={ "status": "submitted" })
patch += increment_component_revision_v1(component_id=component_id, current_revision=0)

state_delta_event = { "type": "STATE_DELTA", "delta": patch }
```

Rust (minimal end-to-end snippet):

```rust
use rivu_server_sdk::{
  set_component_v1, mount_component_v1,
  set_component_state_v1, increment_component_revision_v1,
};
use serde_json::json;

let component_id = "cmp_form_1";

let component = json!({
  "type": "FormCard",
  "schemaVersion": 1,
  "props": { "title": "Demo form", "fields": [] },
  "state": { "status": "pending" },
  "revision": 0,
  "mounts": [],
});

let mut patch = vec![];
patch.extend(set_component_v1(component_id, component));
patch.extend(mount_component_v1(component_id, "msg_1", "inline", 0));
patch.extend(set_component_state_v1(component_id, json!({ "status": "submitted" })));
patch.extend(increment_component_revision_v1(component_id, 0));

let state_delta_event = json!({ "type": "STATE_DELTA", "delta": patch });
```
