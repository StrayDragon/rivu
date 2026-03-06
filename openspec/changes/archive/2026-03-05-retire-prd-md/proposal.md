## Why

当前仓库同时存在 `PRD.md` 与一套更细粒度、可执行的 OpenSpec specs/changes。随着实现推进，继续维护两份“权威来源”会不可避免地产生漂移：开发者不知道该信 PRD 还是信 OpenSpec，新增需求也容易只写在 PRD 而未进入可执行的变更流程。

为了让仓库进入稳定的迭代节奏，需要明确：**OpenSpec changes/specs 是唯一权威**；PRD 退役，改为用 changes 的 proposal/design/tasks + specs 来承载需求与验收。

## What Changes

- 新增一份“规范治理”说明：
  - 定义 OpenSpec changes/specs 的权威性与使用流程（如何 propose/apply/archive）
  - 提供从历史 PRD 到现有/新增 changes 的映射索引（便于读者快速定位）
- **BREAKING（文档治理）**：移除根目录 `PRD.md`，避免继续产生双写与漂移
- 更新文档入口：
  - `README.md` / `docs/README.md` 指向 OpenSpec 作为需求与设计的入口
  - `openspec/changes/README.md` 补齐推荐顺序与新增 changes 列表

## Capabilities

### New Capabilities

- `spec-governance`: 定义仓库需求/设计/任务的权威来源与治理规则（OpenSpec-first），以及 PRD 退役后的索引与入口约定。

### Modified Capabilities

- (none)

## Impact

- Repo 根目录：删除 `PRD.md`（文档入口改变）。
- `README.md` / `docs/*` / `openspec/changes/README.md`：更新链接与索引，降低学习与维护成本。
- 团队流程：新增需求必须通过 `openspec new change ...` 进入 changes，而不是再追加到 PRD。

