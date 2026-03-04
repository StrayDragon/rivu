# Integration Guide (Kernel + Registry)

Rivu is designed for **progressive adoption**. You can stop at any level.

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
- selectors for `state.ui`
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

## `state.ui` rendering

`state.ui` lives inside kernel `sharedState.ui` and contains:

- `components[componentId] = { type, schemaVersion, props, state?, revision, mounts[] }`
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

- `schemaVersion` must match `state.ui.components[componentId].schemaVersion`
- `propsSchema/stateSchema` validate the server-owned data
- `render(...)` must be pure rendering (no tool execution in browser)

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

## UnknownComponent strategy

Unknown/invalid components must **never crash the page**.

`ComponentRenderer` falls back to `UnknownComponentCard` when:

- component not found
- component type not registered
- schemaVersion mismatch
- props/state validation fails

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
- `BarChart` (`schemaVersion: 1`) — props: `{ title?, unit?, items[] }`
- `LineChart` (`schemaVersion: 1`) — props: `{ title?, unit?, points[] }`
- `CitationList` (`schemaVersion: 1`) — props: `{ title?, items[] }` (unsafe/invalid URLs are blocked)

Example `state.ui` component entry:

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
- outputs an AG-UI `STATE_DELTA` to update `state.ui.components[componentId].state/revision`

Supported component types in the processor (MVP):

- `ApprovalCard` (`approve` / `deny`)
- `FormCard` (`setField` / `submit`)
