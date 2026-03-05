## 1. UI state schema 与向量

- [x] 1.1 在 `packages/rivu-ui-spec` 扩展 UI state schema：组件条目支持 `status/error`
- [x] 1.2 增加 golden vectors（building/ready/error 以及非法组合）
- [x] 1.3 在 TS/Python/Rust 测试中验证 vectors 一致通过

## 2. Adapters 与渲染分支

- [x] 2.1 在 `rivu-react` 增加 `ComponentSkeleton` 与 `ComponentErrorCard`（或等价实现）
- [x] 2.2 `ComponentRenderer` 增加 lifecycle 分支与优先级（unknown > error > building > ready）
- [x] 2.3 在 `rivu-svelte` 实现同等分支与组件
- [x] 2.4 增加单元测试：building 渲染 skeleton、error 渲染 ErrorCard、ready 严格校验

## 3. Demo 覆盖

- [x] 3.1 `examples/rivu-react-demo` 增加 lifecycle 示例：building → ready 的多段 patch
- [x] 3.2 增加 “出错组件” 示例：status=error + error 字段展示

## 4. 文档

- [x] 4.1 文档补齐：何时使用 building/error、错误字段的安全约束
- [x] 4.2 文档补齐：与 UnknownComponentCard 的关系与优先级
