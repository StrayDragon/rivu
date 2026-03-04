## 1. Schema 与向量

- [ ] 1.1 在 `packages/rivu-ui-spec` 定义 `ui.v1.capabilities` schema（Zod + JSON schema 输出）
- [ ] 1.2 增加 golden vectors（valid/invalid：缺字段、版本范围非法、features key 类型非法、未知扩展字段等）
- [ ] 1.3 在 TS/Python/Rust 测试中消费同一组 vectors 并断言一致

## 2. Framework adapters（React/Svelte）

- [ ] 2.1 在 `rivu-react` 提供 `buildUiV1Capabilities(registry, features?)` helper（默认填充 `features.datasets/lifecycle/chart.marks/chart.interactions`）
- [ ] 2.2 在 `rivu-svelte` 提供同名/等价 helper（默认填充同一组 features key）
- [ ] 2.3 在 demo 中展示一次握手发送（连接建立或首次请求前），并记录到服务端日志
- [ ] 2.4 增加单元测试：capabilities 反映 registry 与 schemaVersion

## 3. Server SDK（Python/Rust）

- [ ] 3.1 Python：实现 `ui.v1.capabilities` decode/validate + `is_supported/choose_compatible` helpers
- [ ] 3.2 Rust：实现 `ui.v1.capabilities` decode/validate + `is_supported/choose_compatible` helpers
- [ ] 3.3 增加示例降级映射（例如 `Chart` 不可用则退回 `BarChart/LineChart`）

## 4. 文档

- [ ] 4.1 文档补齐：握手时机、payload 示例、服务端选择/降级策略
- [ ] 4.2 文档补齐：能力缺失/过期时的保守策略与客户端 Unknown 降级兜底
