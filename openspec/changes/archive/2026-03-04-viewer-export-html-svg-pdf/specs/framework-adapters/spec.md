## ADDED Requirements

### Requirement: Adapters expose an export entrypoint (Provider-free by default)
官方适配层 MUST 提供导出入口（函数或组件层 API），用于将 kernel state / snapshot 导出为 HTML（以及可选 SVG/PDF）。

导出入口 MUST 默认 Provider-free（可通过显式参数传入所需依赖）。

#### Scenario: Export without Provider
- **WHEN** 宿主显式传入导出所需的 snapshot 或 kernel
- **THEN** 适配层可生成 HTML 导出结果而不要求全局 Provider

