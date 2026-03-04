## Why

Rivu v1 MVP 已有 `rivu-kernel` + `rivu-react` 组件与集成文档，但缺少一个“可直接跑起来”的 React demo 来把 viewer/workflow 组件和 kernel 的接入方式串起来。没有 runnable demo 时，宿主（Zirvox/Crystalith）很难快速验证“像水一样”的最薄接入面（不强绑 Provider、按 mounts 渐进嵌入）。

## What Changes

- 新增一个 Vite + React + TS 的 `examples/` 项目，用于演示：
  - viewer 组件（纯展示、可回放）
  - workflow 组件（server-authoritative state + `ui.v1.event` round-trip）
  - mounts（`slot: inline | sidebar`）在“现有 chat UI”里嵌入组件的方式
- docs 增补 examples 的运行方式与演示点。

## Capabilities

### New Capabilities
- `react-examples`: 提供可运行的 React demo，覆盖 Rivu v1 MVP 的 viewer/workflow 组件与 mounts 嵌入范式。

### Modified Capabilities
- （无）

## Impact

- 新增 `examples/` workspace 项目（Vite/React）。
- 更新 `pnpm-workspace.yaml`（纳入 `examples/*`）。
- 可能更新根 `README.md` / docs 以链接 demo。
