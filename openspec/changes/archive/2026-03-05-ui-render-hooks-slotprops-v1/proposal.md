## Why

PRD 明确要求 Rivu “像水一样可塑形”，除了 theme tokens 与 slots，还必须提供 **Render hooks（数据级扩展点）**：宿主可注入 formatter、linkifier、markdown renderer、代码高亮器，并在渲染前对危险 URL/props 做净化。缺少这些能力会导致：
- 组件无法自然融入宿主的 locale/格式化规则（日期/货币/数字）
- 引入 markdown/link 的展示需求时只能在宿主层各自实现，难以统一与复用
- 安全策略分散：URL/富文本净化无法集中治理

同时，目前 UI kit 的 tokens 覆盖面仍偏窄（大量 padding/font-size 写死），而 slots 只有 `slots`，缺少更细粒度的 `slotProps` 注入能力；这与 PRD 的 “slots + slotProps” 目标存在差距。最后，现有 `rivu-react-shadcn-demo` 仅为 shadcn-style，并非真实使用 `shadcn/ui` 组件栈，无法作为“低侵入融入流行 UI 库”的强验证。

## What Changes

- 引入统一的 Render hooks 契约（宿主可注入）：
  - formatter：数字/日期/货币/通用 value formatter
  - linkifier/URL sanitizer：统一的安全 URL 策略（默认 deny 非 http(s)/mailto）
  - markdown renderer（可选）：宿主提供渲染与净化策略；默认降级为纯文本
  - code highlighter（可选）：宿主提供高亮实现；默认不高亮
  - props sanitizer（可选）：渲染前对 component props 做宿主侧净化/裁剪（不进入协议快照）
- 扩展 theme tokens 覆盖面：新增 typography/spacing 等 tokens，并将官方 UI kit 组件迁移到 tokens 驱动（减少硬编码）。
- 为复杂组件补齐 `slotProps`（在不替换 slot renderer 的情况下向默认子区域注入 props/样式），并统一 slots/slotProps 的命名与语义。
- **BREAKING**：调整 `rivu-react` / `rivu-svelte` 的 registry/renderer 接入面，使 Render hooks 与 slotProps 能作为“宿主配置”被显式传入（并更新本仓库所有 examples/docs 到新写法）。
- 示例升级：将 `examples/rivu-react-shadcn-demo` 升级为真实 `shadcn/ui`（Radix + shadcn 工具链）集成示例，同时保留 `--rivu-*` token bridge 的低侵入策略。

## Capabilities

### New Capabilities

- `ui-render-hooks`: 定义 Render hooks（formatter/linkifier/markdown/highlight/sanitize）契约与默认安全策略，以及它们如何被 adapters 与组件消费。

### Modified Capabilities

- `ui-theme-tokens-slots`: 扩展 tokens 覆盖范围并规范化 `slotProps` 的最低集合。
- `framework-adapters`: 调整 registry/renderer 的宿主接入面，以承载 Render hooks 与 slotProps（Provider 仍保持可选糖）。

## Impact

- `packages/rivu-react` / `packages/rivu-svelte`: 公开 API 变更（registry/renderer/可选 Provider），并在组件渲染链路中接入 render hooks + slotProps。
- `examples/`: `rivu-react-demo` 与 `rivu-react-shadcn-demo` 升级到新 API；shadcn demo 变为真实 `shadcn/ui` 集成。
- `docs/`: 更新 design-system 与 integration 文档，提供 render hooks 与 slotProps 的推荐用法与安全注意事项。

