# Crystalith Integration (SSE + envelope → AG-UI SSE + `state.ui`)

Crystalith today:

- Streams assistant text via SSE (`chunk` / `done` / `error`)
- Embeds rich UI via an in-message marker: `[[crystalith-ui:v1]]` + JSON envelope
- Renders parts using `chatUiComponentRegistry`

Rivu migration goal:

1. Server emits **AG-UI events** over SSE with `id: seq`
2. Rich UI is expressed via **`STATE_SNAPSHOT/STATE_DELTA` updating `sharedState.ui`**
3. Frontend uses `rivu-kernel` to reduce events into state
4. UI is rendered from `state.ui` via `ComponentRenderer` (React) or Svelte resolver primitives

## Where to look (current Crystalith)

- `../crystalith/frontend/web/src/features/workspace/domains/messages/useChat.ts` — SSE streaming + envelope injection
- `../crystalith/frontend/web/src/features/workspace/domains/messages/chatUiEnvelope.ts` — marker parsing
- `../crystalith/frontend/web/src/features/workspace/domains/messages/ChatPanel.tsx` — part rendering + registry
- `../crystalith/frontend/web/src/features/workspace/domains/messages/chatUiRegistry.tsx` — component whitelist (to be replaced by Rivu registry)

## Minimal adapter shape (frontend)

Keep your existing SSE client, but translate events into kernel envelopes:

```ts
import type { RivuKernel } from 'rivu-kernel';

export function onCrystalithSse(params: {
  kernel: RivuKernel;
  seq: number; // from SSE `id:` (or a wrapper field)
  messageId: string; // stable per streaming assistant message
  eventType: 'chunk' | 'done' | 'error';
  data: any;
}) {
  if (params.eventType === 'chunk') {
    const delta = String(params.data?.text ?? '');
    if (!delta) return;
    params.kernel.dispatch({
      seq: params.seq,
      event: { type: 'TEXT_MESSAGE_CHUNK', messageId: params.messageId, role: 'assistant', delta },
    });
    return;
  }

  if (params.eventType === 'done') {
    params.kernel.dispatch({
      seq: params.seq,
      event: { type: 'TEXT_MESSAGE_END', messageId: params.messageId },
    });
    return;
  }
}
```

## Removing `[[crystalith-ui:v1]]`

Instead of embedding JSON inside message content:

- Backend mounts components into `sharedState.ui.components[componentId]`
- Backend updates mounts: `mounts: [{ messageId, slot: "inline", order: 0 }]`
- Frontend renders mounted components next to the message bubble using `selectMountedUiComponentsV1`

Unknown/invalid components degrade to `UnknownComponentCard` (viewer-safe).

## Resume (`resumeFrom`)

With SSE:

- every event uses `id: <seq>`
- reconnect with `Last-Event-ID` / `?resumeFrom=<lastSeq>`

Kernel’s `lastSeq` is the canonical resume point.

