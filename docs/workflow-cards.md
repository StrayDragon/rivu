# Workflow Cards (ConfirmCard, TaskStatusCard)

Rivu workflow cards are designed for **server-authoritative**, **auditable** interactions:

- UI emits `CUSTOM(name="ui.v1.event")` with `clientRequestId` + `baseRevision`
- Server validates + authorizes + executes business logic (and logs/audits)
- Server commits UI changes via `STATE_DELTA` (and bumps `revision`)

## ConfirmCard (stateful)

`ConfirmCard` is intended for “dangerous” operations that **must not** be executed in the browser.

- UI events: `confirm` | `cancel`
- Client does **not** optimistically mark the action as confirmed/cancelled
- Server commits the new state (and revision) via `STATE_DELTA`

### Render (React)

```tsx
import { ConfirmCard } from 'rivu-react';

<ConfirmCard
  kernel={kernel}
  componentId="cmp_confirm"
  revision={component.revision}
  state={component.state}
  title="Delete project?"
  description="This cannot be undone."
/>;
```

### Event shape

When the user clicks Confirm/Cancel, the client sends:

```json
{
  "type": "CUSTOM",
  "name": "ui.v1.event",
  "value": {
    "componentId": "cmp_confirm",
    "eventName": "confirm",
    "payload": {},
    "clientRequestId": "…",
    "baseRevision": 7
  }
}
```

### Backend responsibilities

The server should:

- Authorize the action (user/org/thread/run scope)
- Enforce concurrency (`baseRevision` vs component `revision`)
- Ensure idempotency (`clientRequestId`)
- Execute the business tool **server-side** (and audit it)
- Apply a `STATE_DELTA` commit (update `state` and bump `revision`)

In this repo, the Python/Rust `UiV1EventProcessor` includes a minimal `ConfirmCard` branch as a reference implementation.

## TaskStatusCard (stateless)

`TaskStatusCard` is viewer-safe and replayable: it renders from **props only** and expects the server to update progress/status by patching props.

### Render (React)

```tsx
import { TaskStatusCard } from 'rivu-react';

<TaskStatusCard
  componentId="cmp_task"
  title="Deploy"
  status="running"
  progress={0.42}
  message="Building container…"
/>;
```

### Updating status via `STATE_DELTA`

Servers can update task status by patching the component props:

```json
{
  "type": "STATE_DELTA",
  "delta": [
    { "op": "add", "path": "/ui/components/cmp_task/props/status", "value": "running" },
    { "op": "add", "path": "/ui/components/cmp_task/props/progress", "value": 0.42 },
    { "op": "add", "path": "/ui/components/cmp_task/props/message", "value": "Building container…" }
  ]
}
```

## Theming + overrides

- Components use `--rivu-*` tokens with fallbacks.
- Components accept `className` / `style`.
- Hosts can use `slotProps` for DOM-level overrides and `slots` for render-level customization (especially `ConfirmCard` actions/status).

