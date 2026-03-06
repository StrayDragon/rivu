# FileUploadCard (Workflow)

`FileUploadCard@1` 是一个 **stateful、server-authoritative** 的上传组件。它的核心边界是：

- **文件二进制上传必须 out-of-band**（签名 URL / 既有上传服务 / 代理上传均可）
- `ui.v1.event` **只携带 file refs**（`UploadedFileRef`），不得携带 base64/bytes
- 只有服务端通过 `STATE_DELTA/STATE_SNAPSHOT` 回写组件 `state` 并递增 `revision`，文件才算“已提交/可回放”

## UploadedFileRef

前端与服务端都以 file ref 作为审计与回放的最小单位：

- `id: string`（稳定标识，用于 remove）
- `name: string`
- `sizeBytes: number`
- `mimeType?: string`
- `url?: string`（可选：下载/预览用的已签名/受控 URL）

注意：`url` 渲染前必须经过 URL sanitizer（见“安全注意事项”）。

## Props（`schemaVersion: 1`）

- `title: string`
- `description?: string`
- `accept?: string`
- `maxFiles?: number`
- `maxFileSizeBytes?: number`
- `submitLabel?: string`

## State（server-authoritative）

- `files: UploadedFileRef[]`
- `disabled?: boolean`
- `status?: "idle" | "uploading" | "submitted" | "error"`
- `message?: string`

UI MAY 展示本地上传进度（ephemeral），但 MUST NOT 直接写入 `sharedState.ui`。

## 交互事件（固定集合）

前端通过 `CUSTOM(name="ui.v1.event")` 发出以下事件，并携带：
- `clientRequestId`（用于幂等重试）
- `baseRevision`（用于 optimistic concurrency）

事件集合：

- `file.add`: `{ file: UploadedFileRef }`
- `file.remove`: `{ fileId: string }`
- `file.submit`: `{}`

## 上传实现边界（uploadFile hook）

官方 React UI kit 通过 registration factory 注入上传实现：

- `fileUploadCardRegistrationV1({ uploadFile })`

其中 `uploadFile(file, meta) -> Promise<UploadedFileRef>` 由宿主实现，用于把文件 bytes 上传到你的系统，并返回可审计/可回放的 file ref（例如包含已签名下载 URL）。

## 安全注意事项（URL sanitizer + limits）

- **禁止**把文件内容塞进 `ui.v1.event`（limits/DoS/审计不可控）。
- `UploadedFileRef.url` 必须当作不可信输入：
  - 前端渲染下载链接前必须走 `sanitizeUrl`（默认仅允许 `http/https/mailto`；宿主可进一步收紧到指定域名/协议）。
  - 建议服务端只签发短期有效、最小权限的 URL。
- 建议在 props 中设置 `maxFiles/maxFileSizeBytes`，并在服务端同样 enforce（客户端限制只做 UX）。

## 审计字段建议（可选扩展）

若需要更强审计（谁上传了什么、何时提交），建议在服务端：

- 将审计信息写入业务日志/数据库（推荐）
- 或扩展写入组件 `state`（可回放/可导出），例如：
  - `lastUploadedAtMs`
  - `lastUploadedBy`
  - `lastSubmittedAtMs`
  - `lastSubmittedBy`
  - `lastClientRequestId`

