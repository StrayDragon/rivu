## ADDED Requirements

### Requirement: Viewer components are export-friendly
Viewer 组件 MUST 支持静态导出场景：
- 渲染不依赖交互态（hover/展开等本地状态不应影响导出正确性）
- 不进行网络请求
- 输出可被 HTML/SVG 载入并长期保存

#### Scenario: Component renders identically for export
- **WHEN** 使用同一份 snapshot 渲染组件并进行导出
- **THEN** 导出的静态结果与运行时渲染语义一致（允许样式细节差异，但内容与结构稳定）

