# Export / Review / Restore (Viewer)

Viewer use-cases (Crystalith profile) require:

- stable replay of `sharedState.ui`
- ability to export a **structured JSON snapshot**
- refresh/reconnect restoring UI without re-running tools

## Recommended export JSON (v1)

Rivu does not force a single “thread export” schema, but the following shape is recommended:

```json
{
  "schema": "rivu.export.v1",
  "threadId": "th_...",
  "exportedAtMs": 0,
  "lastSeq": 0,
  "sharedState": {
    "ui": { "v": 1, "components": {} }
  },
  "messages": [],
  "toolCalls": []
}
```

Minimum requirement for rich UI replay:

- `sharedState.ui` must exist and validate as `UiStateV1`

## Restoring `sharedState.ui` via `STATE_SNAPSHOT`

To restore in the browser:

```ts
import { createKernel } from 'rivu-kernel';

const kernel = createKernel();
kernel.dispatch({
  seq: 1,
  event: { type: 'STATE_SNAPSHOT', snapshot: exported.sharedState },
});
```

After this, UI components can be rendered deterministically from `sharedState.ui`.

## Server-side snapshot stores (no external services)

### Python

- Store: `SqliteSnapshotStore.put(thread_id, seq, shared_state)`
- Load: `SqliteSnapshotStore.get_latest(thread_id)`

### Rust

- Store: `SqliteSnapshotStore::put(thread_id, seq, &shared_state)`
- Load: `SqliteSnapshotStore::get_latest(thread_id)`

## Resume vs export

- **Resume** needs a short replay window (`InMemoryRingBufferEventStore`) for quick reconnects.
- **Export/review** should rely on **snapshots** (bounded replay budget) and stable component schemas.
