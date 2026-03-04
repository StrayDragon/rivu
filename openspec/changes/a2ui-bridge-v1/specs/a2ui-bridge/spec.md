## ADDED Requirements

### Requirement: A2UI payload 使用紧凑的 `a2ui.v1` schema
系统 MUST 定义一套紧凑、面向智能体（agent-oriented）的 A2UI payload schema：`a2ui.v1`，用于 LLM 输出。

至少，该 payload MUST 包含：
- `v`: integer version (must be `1`)
- `ops`: an array of operations

每个 operation MUST 属于一组明确且数量受限的支持集合（例如 create/update/mount/unmount/remove），并且 MUST 可被 schema 校验。

#### Scenario: 拒绝非法 A2UI 版本
- **WHEN** 服务收到 `v != 1` 的 A2UI payload
- **THEN** 校验器将其判定为非法并拒绝

### Requirement: A2UI 编译产出安全的 `sharedState.ui` JSON Patch
服务端 MUST 能将合法的 `a2ui.v1` payload 编译为 RFC 6902 JSON Patch operations，用于变更 AG-UI shared state 中的 UI（`sharedState.ui`，即顶层 `ui` key）。

编译器 MUST NOT 允许调用方注入任意 JSON Patch paths；它 MUST 仅为受支持的操作输出 targeting 预期 `ui` 子树的 patch operations。

#### Scenario: 编译仅产生 UI 子树 patch
- **WHEN** 一个 `a2ui.v1` payload 创建并挂载组件
- **THEN** 编译器输出的 patch operations 仅 target `/ui/...` paths

### Requirement: A2UI ops 通过 `key` 支持稳定组件身份
A2UI schema MUST 允许 ops 引用一个稳定的 `key` 标识符。

服务端 MUST 将 `key -> componentId` 作为实现细节进行映射，并且 MUST 将 `componentId` 分配视为 server-authoritative。

#### Scenario: 通过 key 更新命中同一 componentId
- **WHEN** 一个组件首次通过 A2UI 使用 `key="k1"` 创建
- **AND WHEN** 后续某个 A2UI payload 更新 `key="k1"`
- **THEN** 服务端更新同一个底层 `componentId`（而不是新建一个组件）

### Requirement: `key -> componentId` 映射以 `threadId` 为作用域并可持久化
编译器在处理 `a2ui.v1` 时 MUST 以 `threadId`（或等价的线程/会话标识）作为 `key -> componentId` 映射的作用域边界：
- 相同 `threadId` 下，相同 `key` MUST 解析为同一个 `componentId`（除非该 key 显式被移除/重置）
- 不同 `threadId` 之间，映射 MUST 相互隔离（不得串用）

服务端 MUST 以 `threadId` 维度持久化该映射，使其在服务端进程重启/断线续传后仍可恢复稳定的 `componentId` 选择。

#### Scenario: 服务端重启后 key 仍命中同一 componentId
- **WHEN** 在 `threadId="t1"` 下通过 `key="k1"` 创建了组件并得到某个 `componentId`
- **AND WHEN** 服务端重启后再次在同一 `threadId="t1"` 下编译一个更新 `key="k1"` 的 A2UI payload
- **THEN** 服务端仍更新同一个 `componentId`

### Requirement: A2UI 输入不可信且需支持 limits
解码与编译 `a2ui.v1` payloads MUST 支持可配置 limits（至少：max bytes 与 max nesting depth）。

系统 MUST 在进入业务逻辑之前拒绝超过 limits 的 A2UI 输入。

#### Scenario: 拒绝超大 A2UI payload
- **WHEN** A2UI payload 超过配置的最大 size
- **THEN** 解码器拒绝该输入

### Requirement: A2UI v1 校验与编译存在 golden vectors
spec package MUST 提供 golden vectors，包含：
- valid A2UI v1 payloads
- invalid A2UI v1 payloads
- compilation outputs (JSON Patch ops) for selected valid payloads

vectors MUST 可被 TypeScript、Python、Rust 测试套件消费。

#### Scenario: 跨语言编译对 vectors 达成一致
- **WHEN** 各语言实现编译同一个 golden vector 输入
- **THEN** 它们产出等价的 patch outputs（或 vectors 定义的等价语义输出）
