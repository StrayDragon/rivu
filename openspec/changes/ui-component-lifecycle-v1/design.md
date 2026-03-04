## Context

Rivu 的 UI 是可回放的 `sharedState.ui` 真值，但生成与更新不一定是“一次到位”。常见路径包括：
- LLM/服务端先决定“要放一个组件”，但 props 需要后续补齐（或依赖工具结果）
- 服务端在生成 patch 时遇到校验/限额/冲突，导致组件无法进入可渲染状态
- 前端渲染过程中发生异常（未知组件、schema 不匹配、组件代码报错）

当前系统更多依赖 `UnknownComponentCard` 作为最后兜底，缺少统一的生命周期语义与可诊断错误呈现，导致：
- 不同组件/不同框架的 loading/error UX 不一致
- 流式 UI 生成时只能“要么渲染、要么 Unknown”，缺少合适占位
- 调试困难：用户看到空白/Unknown，但不知道是“还在生成”还是“出错了”

## Goals / Non-Goals

**Goals:**
- 在 `sharedState.ui.components[*]` 中引入可选生命周期字段（不破坏现有快照回放）。
- 标准化渲染分支：building → skeleton，ready → 校验后渲染，error → ErrorCard。
- 明确 lifecycle 与 schema 校验的关系：ready 必须严格校验；building 允许部分 props。
- 在 demo 中给出一条可复用的“流式生成组件”链路与验收用例。

**Non-Goals:**
- v1 不定义跨组件的“统一进度条协议”（例如 0~100%）；只提供最小 status 与可选提示文本。
- v1 不替代 UnknownComponent 的降级语义；Unknown 仍是最终兜底。
- v1 不要求服务端必须走 building→ready；一次性 ready 输出仍然允许。

## Decisions

### 1) 生命周期字段是可选扩展，默认 `ready`

**Decision:** 在组件条目中新增可选 `status` 字段，缺失时视为 `ready`。  
**Why:** 兼容现有快照与第三方生产者；不要求一次性迁移所有组件。  
**Alternatives:** 强制字段会造成破坏性变更与迁移成本。

### 2) `building` 状态下不强制 props 完整校验

**Decision:** 当 `status="building"` 时，渲染器优先展示 skeleton/占位态；仅对最小字段做健壮性检查（例如 object 形状），不以 schema 校验失败作为 Unknown。  
**Why:** 流式生成时 props 可能天然不完整；过早 Unknown 会造成闪烁与误导。  
**Alternatives:** 仍然严格校验会让 building 模式失去意义。

### 3) `error` 状态携带 viewer-safe 的结构化错误

**Decision:** `error` 字段采用结构化对象（code/message/details），渲染器展示 ErrorCard；details 允许在开发态更丰富，但不得泄露敏感信息。  
**Why:** 让用户与开发者区分“生成中”与“已失败”，并可定位失败原因。  
**Alternatives:** 仅用字符串错误难以跨语言对齐与测试。

## Risks / Trade-offs

- [状态与实际不一致] 服务端未及时从 building 切到 ready → 通过超时/重试策略（宿主实现）与调试信息提示；规范不强制自动超时。
- [渲染分支复杂] renderer 逻辑变复杂 → 通过明确优先级（unknown > error > building > ready）与集中封装减少散落判断。
- [信息泄露] error details 可能携带敏感信息 → 规范限制 details 的内容，并建议生产环境只保留 code/message。
