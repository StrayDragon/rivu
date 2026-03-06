## Context

仓库最初使用 `PRD.md` 作为“总纲”，随后引入 OpenSpec（`openspec/specs/*` 与 `openspec/changes/*`）作为更细粒度、可执行的需求/设计/任务载体。当前两套体系并存，容易导致：
- 新增需求只写在 PRD 而没有进入 changes（不可执行、不可追踪）
- 已实现内容在 changes/specs 中更新，但 PRD 仍保留旧描述（漂移）
- 新读者不知道入口：该从 PRD、docs，还是 openspec 开始

本变更的目标是完成一次“文档治理迁移”：明确 OpenSpec-first，并移除 PRD 作为权威来源。

## Goals / Non-Goals

**Goals:**
- 明确仓库唯一权威入口：OpenSpec changes/specs。
- 提供从 PRD 到 OpenSpec 的索引映射，确保信息不丢失且可定位。
- 删除根目录 `PRD.md`，避免继续双写。
- 更新 `README.md` 与 docs 入口指向 OpenSpec 工作流（propose/apply/archive）。

**Non-Goals:**
- 不在本变更重新撰写一份“大而全的 PRD 替代品”；用 changes/specs 的组合承载即可。
- 不改变现有代码与发布产物（除文档链接与结构）。

## Decisions

### 1) 以 `openspec/changes/README.md` 作为权威导航目录

**Decision:** 将“推荐顺序 + 索引映射 + 新增变更入口”集中到 `openspec/changes/README.md`，并从 `README.md`/`docs/README.md` 链接到这里。  
**Why:** changes README 是离“可执行工作流”最近的入口；读者可直接从 change 名称进入 proposal/design/tasks。  
**Alternatives:** 在 root README 堆叠大量链接（可读性差）；在 docs 单独维护索引（仍可能漂移）。

### 2) PRD 删除前先保证映射完整

**Decision:** 删除 `PRD.md` 之前，先建立一个“PRD 章节 → 对应 spec/change”的映射表，并将所有尚未覆盖的条目通过新增 changes（proposal/design/specs/tasks）补齐。  
**Why:** 确保知识迁移完整，不因为删除 PRD 丢失上下文。  
**Alternatives:** 直接删除 PRD（短期内读者找不到整体脉络）。

## Risks / Trade-offs

- [入口变化] 依赖 PRD 的读者会迷路 → root README 与 docs README 提供明确跳转，并提供章节映射表。
- [映射维护] 映射表可能再次漂移 → 映射表只做“指针”，权威内容仍在各 specs/changes；新增需求必须走 openspec new change。

## Migration Plan

1) 更新 `openspec/changes/README.md`：补齐索引与推荐顺序，纳入新增 changes。  
2) 添加 PRD→OpenSpec 映射表（一次性迁移文档）。  
3) 删除 `PRD.md`，并在 root README 中移除/替换其链接。  

