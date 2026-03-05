## 1. Package surface & scaffolding

- [x] 1.1 Add `packages/rivu-react/src/thread-kit/*` module structure for Thread UI Kit components
- [x] 1.2 Add `packages/rivu-react/src/tool-cards/*` module structure for ToolCards primitives
- [x] 1.3 Export Thread UI Kit + ToolCards from `packages/rivu-react/src/index.ts` (keep Layer 2 clearly optional)

## 2. ToolCards primitives

- [x] 2.1 Implement `ToolCallCard` (name/args/status) reading from `kernel.state.toolCalls[toolCallId]`
- [x] 2.2 Implement `ToolResultCard` resolving `toolCallId -> resultMessageId -> messages[messageId]` and rendering viewer-safe content
- [x] 2.3 Add theming + overrides: `className/style` + minimal slots for ToolCards (header/body/actions)
- [x] 2.4 Add graceful-degrade paths for missing toolCall / missing result (stable UI, no throws)

## 3. Thread UI Kit components

- [x] 3.1 Implement `RunStatus` rendering `needsResync/resyncReason/gap` from kernel state
- [x] 3.2 Implement `MessageBubble` and `MessageList` rendering `messageOrder/messages` with streaming status
- [x] 3.3 Implement mounts rendering in Thread UI Kit using `selectMountedUiComponentsV1` + `ComponentRenderer` (inline + sidebar)
- [x] 3.4 Implement `ThreadView` composed layout (main thread + optional sidebar), wired to `kernel` + `registry`
- [x] 3.5 Add theming + overrides: `className/style` + minimal slots for message content/tool cards/mount containers

## 4. Examples, docs, and verification

- [x] 4.1 Extend `examples/rivu-react-demo` with a “Thread UI Kit” page (messages + tool cards + mounts + resync state demo)
- [x] 4.2 Add docs page explaining Layer 2 adoption, override points, and “Layer 1 only” vs “Layer 2” decision guidance
- [x] 4.3 Add minimal tests for ToolCards + ThreadView (smoke + missing-data degrade) using existing test stack
- [x] 4.4 Run `pnpm -C packages/rivu-react test` (or repo-wide test command) and ensure demos typecheck/build
