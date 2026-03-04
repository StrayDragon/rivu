# Rivu

Rivu is an **AG-UI compatible UI runtime (kernel) + component kit**, designed to be embedded into existing apps “like water”:

- **Wire format:** AG-UI events
- **UI extension:** `CUSTOM(name="ui.v1.event")`
- **UI state:** stored in `sharedState.ui` (`state.ui` in PRD)
- **Resume:** `seq + resumeFrom` (SSE `id:` / WS wrapper)
- **Security boundary:** server-authoritative component state; browser only renders + sends `ui.v1.event`

## Packages

- `packages/rivu-ui-spec` — `ui.v1.event` + `state.ui` (v1) schemas + JSON schema + golden vectors
- `packages/rivu-kernel` — framework-agnostic reducer/outbox with strict `seq` semantics
- `packages/rivu-react` — React 19 adapter + registry + `ComponentRenderer` + Viewer/Workflow MVP components
- `packages/rivu-svelte` — Svelte 5 adapter (readable store + resolver primitives)
- `python/` — `rivu-server-sdk` (Python 3.12+): validate + store/snapshot + resume + `ui.v1.event` processor
- `crates/rivu-server-sdk` — `rivu-server-sdk` (Rust edition 2024): validate + store/snapshot + resume + `ui.v1.event` processor

## Dev

- Install: `pnpm install`
- TS build+test: `pnpm test`
- React demo: `pnpm -C examples/rivu-react-demo dev`
- Rust tests: `cargo test`
- Python tests: `cd python && uv run pytest`

## Usage (Level 1/2)

### Kernel (framework-agnostic)

```ts
import { createKernel } from 'rivu-kernel';

const kernel = createKernel({
  // send ui.v1.event actions to your backend
  actionTransport: async (action) => {
    await fetch('/api/ui-event', { method: 'POST', body: JSON.stringify(action) });
  },
});

kernel.subscribe(() => {
  console.log('lastSeq', kernel.getState().lastSeq);
});

kernel.dispatch({ seq: 1, event: { type: 'STATE_SNAPSHOT', snapshot: { ui: { v: 1, components: {} } } } });
```

### React adapter + UI kit (Level 2)

```tsx
import { ComponentRenderer, createRegistry, viewerRegistryV1, workflowRegistryV1 } from 'rivu-react';

const registry = createRegistry({
  ...viewerRegistryV1,
  ...workflowRegistryV1,
  // plus your app-specific components...
});

export function InlineUi({ kernel, componentId }: { kernel: any; componentId: string }) {
  return <ComponentRenderer kernel={kernel} registry={registry} componentId={componentId} />;
}
```

### Svelte adapter (Level 2)

Use the kernel store + resolver:

- `kernelStore(kernel)` → `Readable<RivuKernelState>`
- `componentRendererStore({ kernel, registry, componentId })` → `Readable<ResolveUiComponentResult>`
- `resolveUiComponentV1({ state, registry, componentId })` → one-shot resolve for your own components

## Guides

- `docs/integration-quickstart.md` — canonical first integration baseline (SSE/WS envelopes, `resumeFrom`, and rendering mounts from `sharedState.ui`)
- `docs/integration.md` — adoption ladder + kernel/registry usage + UnknownComponent strategy
- `docs/integration-zirvox.md` — Zirvox WS delta/final/abort → AG-UI + `seq` adapter shape
- `docs/integration-crystalith.md` — Crystalith SSE chunk/done/error → AG-UI SSE + removing `[[crystalith-ui:v1]]`
- `docs/export-review.md` — snapshot/export/review + restoring `sharedState.ui` via `STATE_SNAPSHOT`
- `examples/rivu-react-demo` — runnable React demo for viewer + workflow components
