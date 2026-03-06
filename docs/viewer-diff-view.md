# Viewer: DiffView（v1）

`DiffView@1` 是一个 **Viewer-only / stateless / export-friendly** 的差异展示组件，用于“before vs after”对比（报告审阅、变更说明等）。

## Component

- `type: "DiffView"`
- `schemaVersion: 1`

## Props（概念形状，以 `rivu-ui-spec` 为真值）

- `title?: string`
- `beforeLabel?: string`
- `afterLabel?: string`
- `before: string`
- `after: string`
- `mode?: "unified" | "split"`（默认 `unified`）
- `limits?: { maxChars?: number; maxLines?: number }`

## 行级 diff 与安全性

- v1 仅做 **纯文本按行 diff**（不解释/渲染 `before/after` 中的 HTML/Markdown），以保证安全与确定性。
- `limits.maxChars / limits.maxLines` 用于在 diff 前进行确定性裁剪；若发生裁剪，UI/导出会显示 “truncated” 提示，但不会导致页面或导出崩溃。

## Payload sizing 建议

- 对于大文本（长日志/大文件），强烈建议显式设置 `limits`，并在服务端/生成阶段先裁剪到“足够审阅”的片段。
- 若需要更复杂的高亮/语法着色/字符级 diff，请在后续变更中结合 render hooks 扩展（不属于 v1 范围）。

## 导出期望

- HTML 导出与运行时渲染复用同一组件实现：同一份快照输入应产生稳定输出，并且不进行网络请求。

