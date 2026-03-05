# Thread UI Kit (Optional Layer 2)

Rivu is designed for **progressive adoption**:

- **Layer 1**: kernel + registry + `ComponentRenderer` (embed server-owned UI components into your existing chat UI)
- **Layer 1.5**: ToolCards primitives (render tool calls/results from kernel state)
- **Layer 2**: Thread UI Kit (a minimal, optional thread “shell” for new pages/projects)

Layer 2 is intentionally **Provider-free** and **network-free**:
- pass `kernel` and a `registry` explicitly
- no fetch / no tool execution in the browser
- mounts are rendered via the standard `ComponentRenderer`

## When to use Layer 2 vs Layer 1

Use **Layer 1 only** when:
- you already have a chat UI and just need to embed components via mounts (`inline` / `sidebar`)
- you want full control over message layout, virtualization, composer, routing, etc.

Use **Layer 2** when:
- you’re starting a new page/project and want a working thread view fast
- you want a default layout for messages + tool cards + mounts + run status

## ThreadView (messages + tool cards + mounts + run status)

```tsx
import { createKernel } from 'rivu-kernel';
import { ThreadView, createRegistry, viewerRegistryV1, workflowRegistryV1 } from 'rivu-react';

const kernel = createKernel({ actionTransport: async (action) => {/* POST ui.v1.event */} });
const registry = createRegistry({ ...viewerRegistryV1, ...workflowRegistryV1 });

export function App() {
  return <ThreadView kernel={kernel} registry={registry} sidebar />;
}
```

Optional host configuration (same knobs as Layer 1):

```tsx
import { defaultRenderHooks } from 'rivu-react';

<ThreadView
  kernel={kernel}
  registry={registry}
  renderHooks={{ sanitizeUrl: (raw) => defaultRenderHooks.sanitizeUrl(raw) }}
  slotProps={{ DataTable: { td: { className: 'tabular-nums' } } }}
  sidebar
/>;
```

## ToolCards primitives (Layer 1.5)

If you’re using your own thread UI but want consistent tool call/result rendering:

```tsx
import { ToolCallCard, ToolResultCard } from 'rivu-react';

<ToolCallCard kernel={kernel} toolCallId="tool_123" />;
<ToolResultCard kernel={kernel} toolCallId="tool_123" />;
```

## Overrides and theming

- All components use `--rivu-*` tokens with fallbacks.
- All components accept `className` and (where relevant) `style`.
- Most components expose small “slots” to replace key sub-areas (message content, tool card header/body/actions, mounts containers).

If you need deeper customization (virtualization, rich markdown, custom tool visualizations), keep using Layer 1 primitives and selectively adopt ToolCards.

