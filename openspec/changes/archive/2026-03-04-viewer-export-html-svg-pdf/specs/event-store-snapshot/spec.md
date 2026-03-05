## MODIFIED Requirements

### Requirement: Export produces a stable JSON snapshot for Viewer use-cases
系统 MUST 支持导出“结构化 JSON snapshot”，其至少包含：
- 用于查看的 messages 与 tool results
- shared state（包含 `sharedState.ui`）

该 JSON snapshot MUST 可用于确定性回放 Viewer UI，并作为进一步导出格式（HTML/SVG/PDF）的输入。

#### Scenario: Export can be re-rendered consistently
- **WHEN** 一个导出的 JSON snapshot 被导入到 viewer runtime
- **THEN** viewer 能确定性渲染 `sharedState.ui`，未知组件降级且页面保持可用

