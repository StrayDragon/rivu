## Context

当前 Rivu 已实现：
- tokens（`--rivu-*`）与部分 slots（DataTable / Workflow cards）；
- 组件渲染链路（registry + `ComponentRenderer`）；
- Viewer 导出（HTML/SVG/PDF）通过 registry 渲染组件；
- 多个 demos 展示 mounts/datasets/export，以及在宿主 UI（MUI / Tailwind）中通过 token bridge 融合外观。

但 PRD 中的 Render hooks（formatter/linkifier/markdown/code highlight/sanitize）尚未形成稳定契约与统一接入面；同时 slots 只有 “完全替换” 的 `slots`，缺少更细粒度的 `slotProps` 注入能力；tokens 对 typography/spacing 覆盖不足，导致“融入宿主设计系统”仍需要 fork/重写。

此外，为了让 render hooks 与 slotProps 在运行时与导出（Node 侧 `exportHtmlV1`）都可复用，必须把它们作为“宿主配置”与 registry/renderer 链路绑定，而不是依赖 React-only 的 Context（否则导出链路难以共享）。

## Goals / Non-Goals

**Goals:**
- 定义并实现跨 adapters 的 Render hooks 契约（React/Svelte 语义一致），并提供默认安全实现（尤其是 URL sanitizer）。
- 扩展 tokens（typography/spacing）并将官方 UI kit 组件迁移到 tokens 驱动，减少硬编码。
- 为复杂组件补齐 `slotProps`（在不替换 slot renderer 的情况下，向默认子区域注入 props/样式）。
- 将 render hooks 与 slotProps 作为“宿主配置”集成到 registry/renderer 接入面，并升级本仓库所有用例到新写法（不做旧 API 兼容）。
- 升级 shadcn demo 为真实 `shadcn/ui` 集成，作为“低侵入融入流行 UI 库”的强验证。

**Non-Goals:**
- 不把 render hooks 的行为写入协议（`sharedState.ui` 仍只承载 server-owned props/state）。
- 不在本变更引入新的 UI 组件类型（ConfirmCard/TaskStatusCard 等在专门 change 中完成）。
- 不强制宿主使用任何特定 markdown/highlight 实现；官方只提供契约与安全默认。

## Decisions

### 1) Render hooks / slotProps 以“宿主配置对象”接入，而非 React Context 为主

**Decision:** 引入一个统一的宿主配置对象（例如 `RivuHost`/`RivuUiHost`），包含：
- `registry`（组件注册表）
- `renderHooks`（formatter/markdown/linkifier/highlight/sanitize）
- `slotProps`（全局或 per-component 的注入策略）

`ComponentRenderer`（以及导出入口）通过显式参数接收该对象；Provider（如保留）仅作为可选糖，内部同样提供该对象。  
**Why:** 保证 Provider-free 默认 + 让导出链路复用同一套 hook 配置。  
**Alternatives:** 仅用 React Context（导出/非 React 场景难复用）；把 hooks 挂在 `sharedState.ui`（协议耦合与回放负担）。

### 2) 组件在渲染前执行“净化链路”，默认安全且可被宿主收紧

**Decision:** 提供以下默认策略，并允许宿主覆盖：
- `sanitizeUrl(url) -> string|null`：默认仅允许 `http(s):` 与 `mailto:`，其余返回 `null`
- `sanitizeComponentProps(meta, props) -> props`：默认 passthrough；宿主可按 `componentType` 裁剪/替换危险字段（如 `href/src/html`）
- `renderMarkdown(text)`：默认纯文本；宿主可提供 markdown 渲染 + 自己的 HTML sanitizer

**Why:** 安全策略必须集中且可调；默认策略应在不牺牲可用性的前提下防止明显危险输入。  
**Alternatives:** 每个组件各自实现安全策略（分散且不一致）。

### 3) `slotProps` 的目标是“注入而非替换”，最小集合先覆盖复杂组件

**Decision:** `slotProps` 作为可选参数，仅覆盖复杂组件的关键子区域（例如 DataTable 的 table/head/cell，Workflow cards 的 actions/buttons/fields）。  
**Why:** 让宿主在不替换整个 slots 的情况下完成一致的 className/attrs 注入；同时控制 API 复杂度。  
**Alternatives:** 只提供 `slots`（宿主被迫替换整块渲染）；全组件全 DOM 的 slotProps（过度复杂）。

### 4) 扩展 tokens：新增 typography/spacing 并逐步消除硬编码

**Decision:** 在 `tokens.css` 中新增最小 typography/spacing tokens（例如 font-family、font-size、space-*），并将 UI kit 组件的 padding/font-size 迁移为 tokens + fallback。  
**Why:** 宿主设计系统最常见的差异点就是字号/字重/间距；仅颜色/圆角不足以“融入”。  
**Alternatives:** 继续硬编码（宿主只能 fork 或写大量 CSS 覆盖，且难以一致）。

## Risks / Trade-offs

- [BREAKING API] registry/renderer 接入面调整会影响外部使用者 → 本仓库内全量升级 + 文档明确迁移；不提供旧 API 兼容层。
- [Hook 不可控] 宿主提供的 markdown/highlight 可能引入 XSS 或非确定性输出 → 提供默认安全策略；文档强调“宿主必须自行 sanitize HTML”，并建议在导出环境使用同一套确定性实现。
- [维护成本] slotProps 增加组件 API 面积 → 先限定在复杂组件，逐步扩展；为每个组件定义清晰的 slotProps keys 与语义。

## Migration Plan

1) 引入新的宿主配置对象与类型（同时更新 `ComponentRenderer`/capabilities/export 入口）。  
2) 升级本仓库所有 examples/docs 到新写法（一次性迁移）。  
3) 将 UI kit 组件逐步切换到新 tokens + slotProps + render hooks（保持行为一致，增强可覆盖性）。  
4) 升级 shadcn demo 并作为回归用例（确保 tokens bridge + slotProps 生效）。  

## Decisions (continued)

### 5) Formatter hooks are type-oriented (with a unified fallback)

**Decision:** Render hooks 的 formatter API 采用“按类型”的最小集合，并提供一个可选的统一 fallback：
- `formatNumber(value, meta)`
- `formatDateTime(value, meta)`
- `formatCurrency(value, meta)`
- `formatPercent(value, meta)`
- `formatValue(value, meta)`（可选 fallback）

组件渲染时 MUST 优先调用最具体的 formatter；若缺失则 fallback 到 `formatValue`；再缺失则使用安全默认实现（例如 `toLocaleString` / plain string）。

**Why:** 按类型的 hooks 让常见场景（metric/table/axis/tooltip）更易覆盖；统一 fallback 让宿主能一次性接管全局格式策略而不必逐组件改写。

### 6) Props sanitizer returns sanitized props (blocking uses errors + graceful degrade)

**Decision:** `sanitizeComponentProps(meta, props)` MUST 返回一个 JSON object（sanitized props），并且 MUST NOT 返回 `null`。

当宿主需要“阻止渲染”时，sanitizer SHOULD 抛出一个结构化错误；渲染链路 MUST 捕获该错误，并降级为 viewer-safe 的 Error/Unknown 组件展示（页面保持可用，且不修改 `sharedState.ui`）。

**Why:** 返回 `null` 会让组件渲染语义分叉并侵入每个组件；用异常/错误分支能集中处理降级策略，同时保持导出链路的确定性。

### 7) Svelte slotProps uses explicit prop injection (semantics aligned with React)

**Decision:** Svelte 侧 `slotProps` 采用显式 props 注入（与 React 相同语义）：通过 host config 传入 `slotProps` 对象，Svelte 组件在内部子区域/子组件上应用这些注入（class/style/attrs）。

**Why:** 该方案与 Provider-free host config 的设计一致，也能在导出/非 DOM 渲染链路中复用同一套配置；不依赖 Svelte `<slot let:...>` 的模板机制。
