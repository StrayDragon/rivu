## Context

Rivu 的“像水一样”集成意味着：宿主可以选择性引入 UI kit、替换组件实现、裁剪 registry，甚至在不同端（React/Svelte、Viewer/Workflow）支持不同的组件集合与 `schemaVersion`。在这种现实下，服务端（以及生成 UI 的智能体）如果不知道客户端能力，就很容易生成“客户端不支持”的组件，最终只能由 `UnknownComponentCard` 兜底。

我们需要一个轻量、可扩展、跨语言可校验的 capabilities handshake：让客户端把“我能渲染什么”上报给服务端，服务端据此做选择/降级，同时保持：即使握手缺失或撒谎，系统也不会崩溃（仍可降级）。

## Goals / Non-Goals

**Goals:**
- 定义 `ui.v1.capabilities` 的 payload schema（可被 TS/Python/Rust 校验）。
- 能表达组件层能力：`componentType` 与支持的 `schemaVersion`（集合或范围）。
- 能表达关键 feature flags（推荐最小集：`datasets`、`lifecycle`、`chart.marks`、`chart.interactions`），用于服务端选择更兼容的输出形态。
- 为服务端提供明确的“选择/降级”规则（优先选最高兼容版本，缺失则回退到兼容层组件或 Unknown）。

**Non-Goals:**
- capabilities 不是安全边界：不能作为授权/权限依据（仍需 server-side policy）。
- v1 不做复杂的“协商协议”（多轮 negotiate）；只做单次上报 + 服务端选择。
- v1 不要求 kernel 必须负责上报；允许宿主在 transport 层独立发送（保持 kernel headless-first）。

## Decisions

### 1) 使用独立 custom 名称：`CUSTOM(name="ui.v1.capabilities")`

**Decision:** 采用一个独立的 custom event 名称承载 handshake，而不是复用 `ui.v1.event`。  
**Why:** 语义清晰（它不是组件交互事件），并且便于在服务端路由到独立处理逻辑。  
**Alternatives:** 复用 `ui.v1.event` 会混淆 idempotency/revision 语义；改动更大且更易误用。

### 2) 组件能力用“类型 + schemaVersion 集合/范围”表达

**Decision:** payload 中显式声明每个 `componentType` 支持的 `schemaVersion`（例如 `min/max` 或列表）。  
**Why:** schemaVersion 是兼容性的核心维度；仅声明 type 不足以避免版本错配。  
**Alternatives:** 仅靠包版本推断会在宿主自定义 registry 时失真。

### 3) 服务端把 capabilities 视为 hint，并提供确定性降级

**Decision:** 服务端把 capabilities 当作“优化信号”而非真相：缺失/不一致时仍按保守策略输出，并依赖客户端 Unknown 降级兜底。  
**Why:** 客户端能力可能漂移、缓存可能过期；必须容错。  
**Alternatives:** 强依赖握手会导致在握手失败时整条 UI 链路不可用。

## Risks / Trade-offs

- [能力漂移] 客户端升级/降级后，服务端缓存的 capabilities 过期 → 通过 session 维度缓存 + TTL；并允许客户端随时重发覆盖。
- [表达过度膨胀] capabilities 可能变成“大而全” → v1 只要求最小字段（组件 + 少量 feature flags），其余保持可选扩展。
- [实现分歧] 多语言 schema 不一致 → 将 schema 放在 `rivu-ui-spec` 并用 vectors 做一致性测试。
