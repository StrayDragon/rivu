## Why

Workflow 场景里文件/附件是高频能力（提交截图/日志/合同、上传 CSV、附加证据等）。如果缺少一个标准化的上传卡片，宿主会重复实现：
- 选择文件 UI
- 上传链路（签名 URL / 内部上传服务）
- server-authoritative 回写（可回放/可审计）
- 并发/幂等（断线重试不重复写入、不重复触发后端处理）

这类能力如果各自实现，很容易在审计字段、错误处理、以及 “浏览器不执行副作用 tool” 的边界上走样。

本变更引入 `FileUploadCard`：一个 **server-authoritative 的 workflow 组件**，同时明确上传的边界——Rivu 不规定具体上传服务，但提供统一的 UI 契约、事件语义与 server SDK 参考处理器。

## What Changes

- 新增 workflow 组件：
  - `FileUploadCard`（`schemaVersion=1`，stateful）
  - 通过 `ui.v1.event` 回传最小事件集合（`file.add/file.remove/submit`）
  - 服务端 `STATE_DELTA` 回写组件 state 并递增 `revision`
- 定义一个跨语言可校验的 `UploadedFileRef`（文件引用）结构：
  - `FileUploadCard` 的交互 payload 只携带 file refs（不携带文件二进制）
  - 文件二进制上传由宿主/后端渠道完成（签名 URL / 现有上传服务）
- `rivu-ui-spec`：补齐 props/state schema + vectors（TS/Python/Rust 一致校验）。
- Server SDK：
  - Python/Rust 增加内置 `FileUploadCard` 事件处理器（校验 + 幂等 + revision + patch ops）
- `rivu-react`：
  - UI kit 实现 + registry registration（通过注册时注入 `uploadFile()` hook 与宿主上传系统集成，保持 Provider-free）
- examples/docs：
  - demo 增加 FileUploadCard 回归页（模拟 uploadFile hook + server delta 回写）
  - 文档明确“上传边界与安全注意事项”（不要把文件内容塞进 `ui.v1.event`）

## Capabilities

### New Capabilities

- `workflow-file-upload-card`: 定义 `FileUploadCard@1` 的契约（props/state、file ref 结构、事件集合、server-authoritative round-trip 与降级策略）。

### Modified Capabilities

- `server-sdk-python`: 增加 `FileUploadCard` 事件处理器的规范性要求（校验 + 幂等 + revision + patch ops）。
- `server-sdk-rust`: 同步增加 `FileUploadCard` 事件处理器的规范性要求。

## Impact

- `packages/rivu-ui-spec`: 新增 UploadedFileRef + FileUploadCard schema + vectors；更新 JSON schema 生成。
- `packages/rivu-react`: 新增 `FileUploadCard` 组件与 registration factory（注入 `uploadFile` hook）；接入 tokens 与 overrides。
- `python/` 与 `crates/`: 新增 FileUploadCard processor 与单测。
- `examples/rivu-react-demo`: 新增 FileUploadCard 页与 mock-server 处理链路。
- `docs/`: 补齐上传边界、安全与审计建议（尤其是二进制上传不走 `ui.v1.event`）。
