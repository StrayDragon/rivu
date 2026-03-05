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

## `a2ui.v1` Payload（Normative）

`a2ui.v1` 是面向智能体输出的紧凑 UI 描述。其目标是：
- **省 token**：避免输出冗长的 `sharedState.ui`
- **可校验**：在进入业务逻辑之前做 schema 校验 + limits
- **可回放**：编译产出仅影响 `/ui/...` 的 RFC6902 JSON Patch ops

### 顶层结构

```json
{
  "v": 1,
  "ops": []
}
```

- `v` MUST 为 `1`
- `ops` MUST 为 operation 数组

Minimal payload example:

```json
{
  "v": 1,
  "ops": [
    {
      "op": "create",
      "key": "k_metric_revenue",
      "type": "MetricCard",
      "schemaVersion": 1,
      "props": { "label": "Revenue", "value": 128430, "unit": "USD" },
      "mount": { "messageId": "msg_assistant_1", "slot": "inline", "order": 1 }
    }
  ]
}
```

### 通用字段

每个 operation MUST 包含：
- `op`: operation name（v1 支持：`create` / `update` / `mount` / `unmount` / `remove`）
- `key`: stable identifier（用于 `key -> componentId` 映射）

`key` MUST 为非空字符串（trim 后非空），并且 SHOULD 尽量短（例如 `k1`、`summary_chart`）。

### Operation: `create`

创建一个新的组件并可选挂载：

```json
{
  "op": "create",
  "key": "k_metric_revenue",
  "type": "MetricCard",
  "schemaVersion": 1,
  "props": { "label": "Revenue", "value": 128430, "unit": "USD" },
  "state": { "any": "json" },
  "mount": { "messageId": "msg_assistant_1", "slot": "inline", "order": 1 }
}
```

- `type` MUST 为非空字符串
- `schemaVersion` MUST 为正整数（>= 1）
- `props` MUST 为 JSON object
- `state` MAY 为 JSON object
- `mount` MAY 为 `{ messageId, slot, order? }`：
  - `messageId` / `slot` MUST 为非空字符串（trim 后非空）
  - `order` MAY 为整数；若省略则由编译器使用默认值（建议 `0`）

### Operation: `update`

更新一个已存在组件的 `props` 与/或 `state`：

```json
{
  "op": "update",
  "key": "k_metric_revenue",
  "props": { "label": "Revenue", "value": 129001, "unit": "USD" }
}
```

- `props` 与 `state` 至少一个 MUST 出现
- `props` / `state` MUST 为 JSON object（若出现）

### Operation: `mount`

将组件挂载到某个 message slot：

```json
{
  "op": "mount",
  "key": "k_metric_revenue",
  "messageId": "msg_assistant_1",
  "slot": "inline",
  "order": 1
}
```

### Operation: `unmount`

从某个 message slot 卸载组件：

```json
{
  "op": "unmount",
  "key": "k_metric_revenue",
  "messageId": "msg_assistant_1",
  "slot": "inline"
}
```

### Operation: `remove`

移除组件（并重置该 `key` 的映射，使后续可重新 `create`）：

```json
{
  "op": "remove",
  "key": "k_metric_revenue"
}
```

## Limits（Normative）

`a2ui.v1` 输入 MUST 视为不可信，解码与校验 MUST 支持可配置 limits（至少）：
- `maxBytes`: payload size 上限（UTF-8 bytes）
- `maxDepth`: JSON nesting depth 上限

超过 limits 的输入 MUST 在进入业务逻辑之前被拒绝。

## 编译语义（Normative）

### `key -> componentId` 映射

编译器 MUST：
- 以 `threadId` 作为映射作用域边界（不同 threadId 的 key 映射互相隔离）
- 将 `componentId` 分配视为 server-authoritative
- 在处理 `create` 时，为新的 `key` 分配（或生成）一个 `componentId` 并持久化该映射
- 在处理 `remove` 时，删除该 `key` 的映射

### Patch 输出范围

编译器输出的 RFC6902 patch ops MUST 仅 target `/ui/...` paths。

### 最小示例：create + mount 的编译输出（语义）

对于一个 `create`（含 `mount`）的输入，编译器应产出用于：
- 创建 `/ui/components/<componentId>` 条目（含 `type/schemaVersion/props/revision/mounts`）
- 将 mount 追加到 `/ui/components/<componentId>/mounts`

具体 patch ops 以 golden vectors 为准。
