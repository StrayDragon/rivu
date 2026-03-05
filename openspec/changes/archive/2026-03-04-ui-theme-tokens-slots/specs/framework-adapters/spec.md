## ADDED Requirements

### Requirement: 适配层文档化并支持 theme token 集成
官方 framework adapters MUST 文档化“宿主如何通过覆盖 CSS variables 来主题化 UI kit”。

适配层 MUST NOT 为正确性强制要求导入全局 stylesheet，但 MAY 提供可选的默认 stylesheet 作为便利能力。

#### Scenario: 宿主不导入 CSS 也可主题化
- **WHEN** 宿主应用不导入任何 Rivu 提供的 stylesheet
- **THEN** 组件仍能使用 token 的 fallback 值正确渲染
