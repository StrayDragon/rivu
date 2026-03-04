# Zirvox Integration (WS delta/final/abort → AG-UI + `seq`)

Zirvox today streams assistant output via WebSocket events (`delta` / `final` / `abort`) and manually maintains an `assistantDraft`.

Rivu migration goal:

1. **Wrap WS events with `seq`** (use an existing monotonic cursor if available)
2. Convert to **AG-UI text events**
3. Feed `{ seq, event }` into `rivu-kernel`
4. Render UI components from `state.ui` via `ComponentRenderer` (no need to rewrite the whole chat UI)

## Where to look (current Zirvox)

- `../zirvox/frontend/web/src/pages/ChatPage.tsx` — WS streaming + `assistantDraft`
- `../zirvox/sdks/gateway-rpc/src/browser.ts` — WS client, includes `cursor` and `initialLastCursor`

## Minimal adapter shape (frontend)

Use a stable `seq`:

- Prefer `event.cursor` from the WS envelope (monotonic)
- Fallback to a local counter only for prototypes (no real resume)

Convert Zirvox payload → AG-UI:

```ts
import type { RivuKernel } from 'rivu-kernel';

function toMessageId(turnId: string | null) {
  return turnId ? `turn_${turnId}` : `turn_unknown`;
}

export function onZirvoxChatEvent(params: {
  kernel: RivuKernel;
  seq: number; // ideally WS cursor
  turnId: string | null;
  payload: { type: 'delta' | 'final' | 'abort'; content?: string; reason?: string };
}) {
  const messageId = toMessageId(params.turnId);

  if (params.payload.type === 'delta') {
    params.kernel.dispatch({
      seq: params.seq,
      event: { type: 'TEXT_MESSAGE_CHUNK', messageId, role: 'assistant', delta: params.payload.content ?? '' },
    });
    return;
  }

  if (params.payload.type === 'abort') {
    params.kernel.dispatch({
      seq: params.seq,
      event: { type: 'TEXT_MESSAGE_CHUNK', messageId, role: 'assistant', delta: `[aborted] ${params.payload.reason ?? 'unknown'}` },
    });
    return;
  }

  if (params.payload.type === 'final') {
    params.kernel.dispatch({
      seq: params.seq,
      event: { type: 'TEXT_MESSAGE_END', messageId },
    });
  }
}
```

## Resume (`resumeFrom`)

Kernel maintains `lastSeq`. On reconnect, use:

```ts
const resumeFrom = kernel.getState().lastSeq;
```

If Zirvox’s WS layer supports replay-by-cursor (it already has `initialLastCursor`), map:

- `resumeFrom` ↔︎ `last_cursor`
- `seq` ↔︎ `cursor`

## UI components (`state.ui`)

Once your backend starts emitting `STATE_SNAPSHOT/STATE_DELTA` with `sharedState.ui`, render by mounting points:

- find mounted components via `selectMountedUiComponentsV1`
- render with `rivu-react` `ComponentRenderer` (or Svelte resolver)

This keeps Zirvox’s existing Chat shell intact; only the “rich UI rendering block” is replaced.

