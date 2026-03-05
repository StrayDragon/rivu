## ADDED Requirements

### Requirement: ComponentRenderer 按 lifecycle status 选择渲染分支
Adapters 的 `ComponentRenderer` MUST 根据 `sharedState.ui.components[componentId]` 的生命周期字段选择渲染分支（优先级从高到低）：
1) unknown：组件未注册或（在 ready 状态下）schema 校验失败 → `UnknownComponent` fallback
2) error：`status="error"` → `ComponentErrorCard`
3) building：`status="building"` → `ComponentSkeleton`
4) ready：`status` 缺失或等于 `"ready"` → 正常渲染

#### Scenario: Renderer respects building status
- **WHEN** 一个组件类型已注册，但其条目 `status="building"`
- **THEN** `ComponentRenderer` 渲染 skeleton 分支，并保持页面可用

