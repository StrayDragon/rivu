## ADDED Requirements

### Requirement: UI kit 提供通用 Skeleton 与 ErrorCard
UI kit MUST 提供通用的 viewer-safe 占位与错误组件，用于统一生命周期渲染：
- `ComponentSkeleton`（或等价）：用于 `status="building"`
- `ComponentErrorCard`（或等价）：用于 `status="error"`

这两者 MUST 不依赖网络请求，并且在相同 props 下渲染稳定可回放。

#### Scenario: Building status shows skeleton
- **WHEN** 一个已注册组件条目 `status="building"`
- **THEN** UI 渲染 skeleton/占位态，而不是直接降级为 Unknown

