# A2UI Bridge（v1）

Rivu 的 UI 真值是 `sharedState.ui`（通过 AG-UI 的 `STATE_SNAPSHOT/STATE_DELTA` 回放）。这对前端渲染与导出很稳，但对 LLM 来说不友好：结构冗长、重复 key 多、且容易在 patch/mount/revision 语义上出错。

`a2ui.v1` 是面向智能体输出的紧凑结构；服务端负责把它**解码/校验/编译**成受控的 RFC6902 JSON Patch ops（仅影响 `/ui/...`），再以 `STATE_DELTA` 发送给前端 kernel。

## 分工

- **A2UI（Agent-to-UI）**：回答“UI 长什么样”（更省 token 的组件声明/更新意图）
- **AG-UI**：回答“如何协同工作”（事件流、同步、回放、以及 workflow 交互回传）

浏览器端只消费 AG-UI 事件与 `sharedState.ui`；`a2ui.v1` 不直接暴露给浏览器。

## `a2ui.v1` 一眼看懂

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
      "mount": { "messageId": "msg_1", "slot": "inline", "order": 1 }
    }
  ]
}
```

- `key` 是稳定句柄；服务端把 `key -> componentId` 作为实现细节持久化，并以 `threadId` 隔离作用域。
- 编译器只产出 `/ui/...` 下的 patch ops（RFC6902），不会允许外部注入任意 path。

## 推荐链路（服务端）

1) 接收 LLM 输出的 `a2ui.v1`（bytes / string / object）
2) 解码 + schema 校验 + limits（至少 `maxBytes/maxDepth`）
3) 编译为 `patchOps`（RFC6902）
4) 发出 AG-UI `STATE_DELTA`：`{ "type": "STATE_DELTA", "delta": patchOps }`
5) 前端 kernel 归约到新的 `sharedState`，viewer 组件从 `sharedState.ui` 回放渲染

## 最小闭环示例（Python）

```py
from rivu_server_sdk import (
  A2uiV1,
  InMemoryKeyMapStore,
  compile_a2ui_v1,
  decode_a2ui_v1_with_limits_v1,
)
from rivu_server_sdk.limits import viewerDefaults

thread_id = "t1"
key_map = InMemoryKeyMapStore()

shared_state = {"ui": {"v": 1, "components": {}}}

# 1) LLM 输出（示例）
raw = {
  "v": 1,
  "ops": [
    {
      "op": "create",
      "key": "k_metric_revenue",
      "type": "MetricCard",
      "schemaVersion": 1,
      "props": {"label": "Revenue", "value": 128430, "unit": "USD"},
      "mount": {"messageId": "msg_1", "slot": "inline", "order": 1},
    }
  ],
}

# 2) decode + limits + schema validate
payload: A2uiV1 = decode_a2ui_v1_with_limits_v1(raw, limits=viewerDefaults)

# 3) compile -> patchOps（仅 /ui/...）
result = compile_a2ui_v1(payload=payload, shared_state=shared_state, thread_id=thread_id, key_map_store=key_map)
patch_ops = result["patchOps"]

# 4) 发出 STATE_DELTA（给前端）
event = {"type": "STATE_DELTA", "delta": patch_ops}
```

## 最小闭环示例（Rust）

```rs
use rivu_server_sdk::{
  compile_a2ui_v1, decode_a2ui_v1_with_limits_v1, InMemoryKeyMapStore, UiInputLimitsV1,
};
use serde_json::json;

let thread_id = "t1";
let key_map = InMemoryKeyMapStore::new();
let shared_state = json!({ "ui": { "v": 1, "components": {} } });

let raw = json!({
  "v": 1,
  "ops": [{
    "op": "create",
    "key": "k_metric_revenue",
    "type": "MetricCard",
    "schemaVersion": 1,
    "props": { "label": "Revenue", "value": 128430, "unit": "USD" },
    "mount": { "messageId": "msg_1", "slot": "inline", "order": 1 }
  }]
});
let bytes = serde_json::to_vec(&raw).unwrap();

let limits = UiInputLimitsV1::default();
let payload = decode_a2ui_v1_with_limits_v1(&bytes, &limits).unwrap();

let result = compile_a2ui_v1(&shared_state, &payload, thread_id, &key_map, None).unwrap();
let patch_ops = result.patch_ops;

let event = json!({ "type": "STATE_DELTA", "delta": patch_ops });
```

## `KeyMapStore` 持久化

为了在服务端重启/断线续传后仍保持稳定的 `componentId` 选择，`key -> componentId` 映射应以 `threadId` 为作用域持久化。

- Python：`SqliteKeyMapStore(path)`（示例实现）
- Rust：`SqliteKeyMapStore::new(path)`（示例实现）

