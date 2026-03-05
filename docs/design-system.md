# 融入现有 Design System（Theme Tokens + Slots）

Rivu 的 UI kit 目标是“像水一样可塑形”：默认提供可用的组件实现，但允许宿主应用用**自己的 design tokens / 暗色策略 / 子渲染**去覆盖，而不需要 fork 组件或修改 `sharedState.ui`。

本指南覆盖两类入口：
- **Theme tokens（CSS variables）**：用 CSS 覆盖 `--rivu-*` 变量来统一换肤（含图表 palette）
- **Slots / render hooks**：用宿主本地配置替换复杂组件的关键子区域（不进入协议快照）

## 1) Theme tokens（CSS variables）

所有官方组件都使用 `var(--rivu-*, <fallback>)` 渲染，因此：
- 不导入任何 Rivu CSS 文件也能工作（使用 fallback）
- 宿主可以在任意容器上覆盖 CSS variables，实现局部主题

### 可选：引入默认 tokens stylesheet（快速起步）

如果你希望“先有一套默认变量”，可以引入：

```ts
import 'rivu-react/tokens.css';
```

这会在 `:root` 上提供一组 `--rivu-*` 默认值（含 `--rivu-chart-*` 调色板与少量语义背景色）。

### 覆盖 tokens（推荐做法）

你可以把 Rivu tokens 映射到你自己的 design system tokens：

```css
:root {
  --rivu-bg: var(--ds-surface);
  --rivu-fg: var(--ds-fg);
  --rivu-muted: var(--ds-fg-muted);
  --rivu-border: var(--ds-border);
  --rivu-radius: var(--ds-radius-lg);

  /* 图表 palette（至少 4 个） */
  --rivu-chart-1: var(--ds-chart-1);
  --rivu-chart-2: var(--ds-chart-2);
  --rivu-chart-3: var(--ds-chart-3);
  --rivu-chart-4: var(--ds-chart-4);
}
```

### 暗色策略（两种常见方式）

1) 跟随系统：

```css
@media (prefers-color-scheme: dark) {
  :root {
    --rivu-bg: #0b1220;
    --rivu-fg: #e2e8f0;
    --rivu-border: #334155;
    --rivu-chart-1: #38bdf8;
  }
}
```

2) 跟随宿主的 `.dark`（或任意主题 class）：

```css
.dark {
  --rivu-bg: #0b1220;
  --rivu-fg: #e2e8f0;
  --rivu-border: #334155;
}
```

## 2) Slots / Render hooks（复杂组件）

### DataTable：cell / empty state slots

`DataTable` 支持 `slots.Cell` 与 `slots.EmptyState`，用于宿主自定义渲染（例如数值格式化、空态替换），并且**不需要修改** server-owned `props/rows`。

最常见的方式是在 registry 中覆盖该组件的 `render`：

```tsx
import {
  createRegistry,
  viewerRegistryV1,
  DataTable,
  DATA_TABLE_COMPONENT_TYPE,
  dataTableRegistrationV1,
} from 'rivu-react';

const registry = createRegistry({
  ...viewerRegistryV1,
  [DATA_TABLE_COMPONENT_TYPE]: {
    ...dataTableRegistrationV1,
    render: ({ props }) => (
      <DataTable
        {...props}
        slots={{
          EmptyState: () => <div>Nothing here yet.</div>,
          Cell: ({ value, column }) => {
            if (column.key === 'amount' && typeof value === 'number') {
              return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
            }
            return value ?? '';
          },
        }}
      />
    ),
  },
});
```

### Workflow cards：actions / status slots

`ApprovalCard` 与 `FormCard` 提供最小的 `slots` 入口，用于替换 actions/status 区域的子渲染，同时保持 server-authoritative 行为不变（仍然发出 `ui.v1.event`）。

同样推荐在 registry 的 `render` 里注入 slots（示意）：

```tsx
import {
  createRegistry,
  workflowRegistryV1,
  APPROVAL_CARD_COMPONENT_TYPE,
  approvalCardRegistrationV1,
  ApprovalCard,
} from 'rivu-react';

const registry = createRegistry({
  ...workflowRegistryV1,
  [APPROVAL_CARD_COMPONENT_TYPE]: {
    ...approvalCardRegistrationV1,
    render: ({ kernel, componentId, revision, props, state }) => (
      <ApprovalCard
        kernel={kernel}
        componentId={componentId}
        revision={revision}
        {...props}
        state={state}
        slots={{
          Actions: ({ onApprove, onDeny }) => (
            <div>
              <button onClick={onApprove}>Yes</button>
              <button onClick={onDeny}>No</button>
            </div>
          ),
        }}
      />
    ),
  },
});
```

## 3) Svelte 说明

Rivu 的 tokens 是纯 CSS variables，因此跨框架一致。  
Svelte 侧的 slots 形式可以 idiomatic（原生 `<slot>` / props），但语义建议与 React 对齐：
- DataTable：支持 cell 渲染与 empty state 替换
- Workflow cards：支持 actions/status 区域替换

