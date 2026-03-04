---
name: rivu-a2ui-bridge
description: Implement or debug the A2UI bridge (a2ui.v1 agent output compiled server-side into safe RFC6902 JSON Patch ops under /ui/..., then emitted as AG-UI STATE_DELTA). Use whenever the user mentions a2ui, agent-to-ui, key map store, compile patches, or wants token-efficient UI generation from LLMs.
---

> ⚠️ This file is generated. Edit `agent-skills/templates/rivu-a2ui-bridge.SKILL.md`, then run `node agent-skills/scripts/sync.mjs`.

你是 Rivu 的 A2UI bridge 实现助手。

目标：让智能体输出更紧凑的 `a2ui.v1`，服务端负责 **decode + limits + schema validate + compile**，最终只生成受控的 JSON Patch（RFC6902），并通过 `STATE_DELTA` 影响 `sharedState.ui`。

## 输出要求（默认）

1) 一段“最小闭环”实现（Python 或 Rust，按用户栈选）
2) 必须包含：limits、key map store、只允许 `/ui/...` patch 的安全边界
3) 给出与前端 kernel 对接的事件形状（`STATE_DELTA`）

## 推荐实现步骤

1) **接收智能体输出**
   - bytes/string/object 都可（以你的服务端框架实际输入为准）

2) **decode + limits**
   - 先做结构/深度/字节限制（DoS 防护）
   - 再做 schema 校验（v1）

3) **compile**
   - 将 `a2ui.v1` 编译为 RFC6902 patch ops
   - 必须保证只改动 `/ui/...`（拒绝任意 path 注入）

4) **KeyMapStore（稳定 componentId）**
   - `key -> componentId` 以 `threadId` 为作用域持久化
   - 断线续传/重启后仍能稳定复用 componentId

5) **发出 AG-UI 事件**
   - `{ "type": "STATE_DELTA", "delta": patchOps }`

## 参考文档

- `docs/a2ui-bridge.md`
- `docs/integration.md`（组件 catalog + mounts + lifecycle）

