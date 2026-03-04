## Context

Rivu 的核心安全边界是：浏览器只做渲染与上报 `ui.v1.event`，有副作用的业务工具在后端执行并可审计。

文件上传属于必须的“副作用网络操作”，但它不应被当作 tool call 由模型直接驱动；同时也不应把文件内容塞进 `ui.v1.event`（limits/DoS/审计与存储都不可控）。

因此，本变更把 FileUploadCard 拆成两层：
- **UI 协议层（Rivu）**：只定义 file refs 的结构、事件语义与 server-authoritative state
- **上传实现层（宿主）**：由宿主注入 `uploadFile(file) -> UploadedFileRef`，复用既有上传服务或签名 URL 体系

## Goals / Non-Goals

**Goals:**
- 定义并实现 `FileUploadCard@1`（stateful）：
  - props 表达 UI 文案、限制（accept/maxFiles/maxBytes）
  - state 表达已提交的 file refs 列表、错误与 status
  - 交互通过 `ui.v1.event` 回传（不含二进制），服务端 delta 回写并递增 revision
- 定义 `UploadedFileRef` 的跨语言 schema（用于审计/回放/后续 tool 使用）。
- 保持 Provider-free：官方 registration 以 factory 形式注入 `uploadFile` hook（由宿主实现上传）。
- Python/Rust SDK 提供内置 processor：校验 + 幂等 + revision + patch ops 输出。

**Non-Goals:**
- 不在 v1 规定上传的后端协议细节（S3 签名 URL / 直传 / 代理上传均可）。
- 不在 v1 处理分片/断点续传/秒传（由宿主上传系统负责）。
- 不在 v1 提供“文件内容预览渲染器”全家桶（只提供最小 viewer-safe 文件列表展示；预览可通过 slots/overrides 扩展）。

## Decisions

### 1) `ui.v1.event` 只携带 file refs，不携带文件内容

**Decision:** `FileUploadCard` 的交互 payload 只允许携带 `UploadedFileRef` 与必要的 metadata；MUST NOT 包含文件二进制内容（base64 等）。

**Why:** 保持 limits 可控、审计清晰、存储成本可控，并避免把上传协议耦合进 UI runtime。

### 2) 上传实现由宿主注入 `uploadFile` hook（registration factory）

**Decision:** 官方 `FileUploadCard` registration 以 factory 暴露：
- `fileUploadCardRegistrationV1({ uploadFile })`

其中 `uploadFile(file, meta) -> Promise<UploadedFileRef>` 由宿主实现（可复用现有上传服务/签名 URL/鉴权）。

**Why:** 既保持 Provider-free，也避免让 Rivu UI kit 直接绑定某种上传后端形态。

### 3) server-authoritative：只有服务端 delta 才能“提交”文件到 state

**Decision:** UI MAY 展示本地上传进度（ephemeral），但 MUST NOT 将文件视为“已提交”除非收到服务端 `STATE_DELTA` 将 file ref 写入组件 state 并递增 revision。

**Why:** 保证回放一致性与审计一致性；断线/重试不会产生重复提交。

## API Shape (v1)

- `type = "FileUploadCard"`
- `schemaVersion = 1`

### UploadedFileRef

概念形状（以 `rivu-ui-spec` 为准）：
- `id: string`（稳定标识，用于 remove）
- `name: string`
- `sizeBytes: number`
- `mimeType?: string`
- `url?: string`（可选；用于下载/预览的已签名/受控 URL；渲染必须走 URL sanitizer）

### FileUploadCard props

- `title: string`
- `description?: string`
- `accept?: string`（input accept 形状；可选）
- `maxFiles?: number`
- `maxFileSizeBytes?: number`
- `submitLabel?: string`

### FileUploadCard state

- `files: UploadedFileRef[]`
- `disabled?: boolean`
- `status?: "idle"|"uploading"|"submitted"|"error"`
- `message?: string`（可选）

### Events

固定事件集合（均通过 `ui.v1.event`）：
- `file.add`: `{ file: UploadedFileRef }`
- `file.remove`: `{ fileId: string }`
- `file.submit`: `{}`

## Migration Plan

1) `rivu-ui-spec`：新增 UploadedFileRef + FileUploadCard schema + vectors。  
2) `rivu-react`：实现组件 + registration factory（upload hook），并在 demo 中挂载。  
3) `python/` 与 `crates/`：新增 processor 与单测（幂等/冲突）。  
4) docs：补齐上传边界与安全指南（URL sanitizer、limits、审计字段）。  
