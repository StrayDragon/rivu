# Integration Quickstart (SSE/WS → `{seq,event}` → `rivu-kernel` → `sharedState.ui`)

This document defines the **canonical** "first integration" baseline for Rivu.

Terminology note:
- In the PRD this is sometimes described as `state.ui`.
- In the implementation it is **always** stored under `sharedState.ui` (i.e. the `ui` key inside the shared state snapshot).

## 1) Server: emit envelopes `{ seq, event }`

Rivu expects strictly ordered envelopes:

```ts
type Envelope = { seq: number; event: unknown };
```

- `seq` MUST be a positive integer.
- For a given thread/stream, `seq` MUST increase by 1 each time.

### SSE shape

Recommended SSE mapping:
- `id: <seq>`
- `data: <JSON.stringify(event)>`

Example (conceptual):

```txt
id: 42
data: {"type":"TEXT_MESSAGE_CHUNK","messageId":"msg_1","role":"assistant","delta":"Hello"}
```

### WebSocket shape

Recommended WS message:

```json
{ "seq": 42, "event": { "type": "TEXT_MESSAGE_CHUNK", "messageId": "msg_1", "role": "assistant", "delta": "Hello" } }
```

## 2) Client: create a kernel and dispatch envelopes

```ts
import { createKernel } from 'rivu-kernel';

const kernel = createKernel({
  actionTransport: async (action) => {
    // POST `ui.v1.event` to your backend
  },
});
```

### Limits（推荐）

Rivu 会把所有 inbound 的结构化 JSON（`ui.v1.event` / `sharedState.ui` / JSON Patch）视为不可信输入。  
建议为 kernel 配置 `limits`，防止 UI “爆炸”与 DoS，并在超限时得到可诊断信息。

使用官方推荐默认值（Viewer / Workflow 两种 profile）：

```ts
import { createKernel } from 'rivu-kernel';
import { viewerDefaults, workflowDefaults } from 'rivu-ui-spec';

const kernel = createKernel({
  limits: viewerDefaults, // or: workflowDefaults
  actionTransport: async (action) => {
    // POST `ui.v1.event` to your backend
  },
});
```

覆盖单个字段示例（只收紧 `jsonPatch.maxOps`，其余保持默认）：

```ts
import { createKernel } from 'rivu-kernel';
import { viewerDefaults } from 'rivu-ui-spec';

const kernel = createKernel({
  limits: {
    ...viewerDefaults,
    jsonPatch: { ...viewerDefaults.jsonPatch, maxOps: 500 },
  },
});
```

Dispatch every server envelope:

```ts
kernel.dispatch({ seq, event });
```

If you emit the recommended SSE/WS shapes, you can use the built-in decode helpers:

```ts
import { decodeSseMessageToEnvelope, decodeWsMessageToEnvelope } from 'rivu-kernel';

// SSE (EventSource)
es.onmessage = (msg) => {
  const r = decodeSseMessageToEnvelope({ id: msg.lastEventId, data: msg.data });
  if (!r.ok) return;
  kernel.dispatch(r.envelope);
};

// WS
ws.onmessage = (msg) => {
  const r = decodeWsMessageToEnvelope(msg.data);
  if (!r.ok) return;
  kernel.dispatch(r.envelope);
};
```

### Streaming event variant (recommended)

In docs and official examples, the default streaming variant is:
- `TEXT_MESSAGE_CHUNK` for streamed text deltas
- `TOOL_CALL_CHUNK` for streamed tool-call argument deltas

`TEXT_MESSAGE_CONTENT` / `TOOL_CALL_ARGS` remain supported as compatibility variants, but avoid mixing variants in a single integration.

## 3) Resume: reconnect with `resumeFrom = lastSeq`

The kernel’s `lastSeq` is the canonical resume cursor:

```ts
const resumeFrom = kernel.getState().lastSeq;
```

Recommended reconnect strategy:
- If your transport supports replay-by-cursor, request envelopes starting from `resumeFrom + 1`
- Otherwise, request a fresh `STATE_SNAPSHOT`

If the kernel detects a sequence gap or a patch error, it will set:
- `needsResync = true`
- `resyncReason = "gap" | "patch_error" | "limit_exceeded"`

Use those signals to trigger replay/snapshot and restore a consistent `sharedState`.

当 `resyncReason = "limit_exceeded"` 时，kernel 还会设置结构化诊断字段：
- `limitExceeded = { limit, max, observed, path? }`

## 4) Render UI from `sharedState.ui` mounts (React)

Rivu UI components are **server-owned** and stored under `sharedState.ui.components`.
Placement is expressed via `mounts[] = { messageId, slot, order }`.

Minimal React rendering loop:

```tsx
import { selectMountedUiComponentsV1, type RivuKernel } from 'rivu-kernel';
import { ComponentRenderer, createRegistry, viewerRegistryV1, workflowRegistryV1 } from 'rivu-react';

const registry = createRegistry({ ...viewerRegistryV1, ...workflowRegistryV1 });

function MessageInlineMounts(props: { kernel: RivuKernel; messageId: string }) {
  const state = props.kernel.getState();
  const mounted = selectMountedUiComponentsV1({ state, messageId: props.messageId, slot: 'inline' });
  return (
    <div>
      {mounted.map((m) => (
        <ComponentRenderer key={m.componentId} kernel={props.kernel} registry={registry} componentId={m.componentId} />
      ))}
    </div>
  );
}
```

Svelte integration uses the same data model (`sharedState.ui`) but renders via `kernelStore(...)` and resolver primitives.
