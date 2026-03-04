## 1. Schema 与向量

- [ ] 1.1 在 `packages/rivu-ui-spec` 增加 chart selection state 与 payload schema（`chart.setSelection/chart.clearSelection`）
- [ ] 1.2 增加 golden vectors（valid/invalid：rowIndex 越界、range 缺字段、kind 非法等）
- [ ] 1.3 在 TS/Python/Rust 测试中消费同一组 vectors 并断言一致

## 2. UI kit：Chart 交互与渲染

- [ ] 2.1 `rivu-react` 的 `Chart` 增加可选交互模式（click/brush → emit `ui.v1.event`）
- [ ] 2.2 `Chart` 支持渲染 `component.state.selection`（高亮/标签/tooltip）
- [ ] 2.3 `rivu-svelte` 实现同等交互与 selection 渲染
- [ ] 2.4 增加单元测试：点击触发 `chart.setSelection` 且包含正确 `baseRevision`

## 3. Server SDK：交互处理器

- [ ] 3.1 Python：实现 chart interaction processor（校验 payload、更新 `state.selection`、递增 revision、输出 patch ops）
- [ ] 3.2 Rust：实现同等 processor，并补齐越界/非法 payload 的可诊断错误
- [ ] 3.3 增加 processor tests（包含并发冲突与幂等重试）

## 4. Demo 与文档

- [ ] 4.1 `examples/rivu-react-demo` 增加 chart 交互 round-trip（mock server 处理并回写 `STATE_DELTA`）
- [ ] 4.2 文档补齐：事件名、payload 示例、selection state 形状与 token 节省建议（优先 rowIndex/范围引用）
