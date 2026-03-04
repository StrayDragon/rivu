## 1. Package surface & scaffolding

- [ ] 1.1 Add `packages/rivu-react/src/thread-kit/*` module structure for Thread UI Kit components
- [ ] 1.2 Add `packages/rivu-react/src/tool-cards/*` module structure for ToolCards primitives
- [ ] 1.3 Export Thread UI Kit + ToolCards from `packages/rivu-react/src/index.ts` (keep Layer 2 clearly optional)

## 2. ToolCards primitives

- [ ] 2.1 Implement `ToolCallCard` (name/args/status) reading from `kernel.state.toolCalls[toolCallId]`
- [ ] 2.2 Implement `ToolResultCard` resolving `toolCallId -> resultMessageId -> messages[messageId]` and rendering viewer-safe content
- [ ] 2.3 Add theming + overrides: `className/style` + minimal slots for ToolCards (header/body/actions)
- [ ] 2.4 Add graceful-degrade paths for missing toolCall / missing result (stable UI, no throws)

## 3. Thread UI Kit components

- [ ] 3.1 Implement `RunStatus` rendering `needsResync/resyncReason/gap` from kernel state
- [ ] 3.2 Implement `MessageBubble` and `MessageList` rendering `messageOrder/messages` with streaming status
- [ ] 3.3 Implement mounts rendering in Thread UI Kit using `selectMountedUiComponentsV1` + `ComponentRenderer` (inline + sidebar)
- [ ] 3.4 Implement `ThreadView` composed layout (main thread + optional sidebar), wired to `kernel` + `registry`
- [ ] 3.5 Add theming + overrides: `className/style` + minimal slots for message content/tool cards/mount containers

## 4. Examples, docs, and verification

- [ ] 4.1 Extend `examples/rivu-react-demo` with a “Thread UI Kit” page (messages + tool cards + mounts + resync state demo)
- [ ] 4.2 Add docs page explaining Layer 2 adoption, override points, and “Layer 1 only” vs “Layer 2” decision guidance
- [ ] 4.3 Add minimal tests for ToolCards + ThreadView (smoke + missing-data degrade) using existing test stack
- [ ] 4.4 Run `pnpm -C packages/rivu-react test` (or repo-wide test command) and ensure demos typecheck/build

