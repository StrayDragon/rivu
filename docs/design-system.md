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

## 2) Slots / SlotProps / Render hooks（复杂组件）

### SlotProps：inject without replace（推荐）

当你只想“在默认子区域上注入 className/style/attrs”，而不想替换整个子渲染时，使用 `slotProps`：

```ts
import { createHost, createRegistry, viewerRegistryV1, workflowRegistryV1 } from 'rivu-react';

const registry = createRegistry({ ...viewerRegistryV1, ...workflowRegistryV1 });

const host = createHost({
  registry,
  slotProps: {
    DataTable: {
      table: { className: 'text-sm' },
      th: { className: 'uppercase tracking-wide' },
      td: { className: 'tabular-nums' },
      emptyState: { className: 'text-muted-foreground' },
    },
    ApprovalCard: {
      actions: { className: 'justify-end' },
      approveButton: { className: 'shadow-sm' },
      denyButton: { className: 'shadow-sm' },
    },
    FormCard: {
      fields: { className: 'gap-4' },
      submitButton: { className: 'w-full' },
    },
  },
});
```

它的目标是：
- **保留默认渲染行为**（不影响 server-authoritative props/state）
- 在宿主侧统一注入：`className`、`style`、`data-*`、`aria-*` 等

当你需要彻底替换子渲染（自定义 DOM/组件结构）时，再使用 `slots`（下一节）。

### DataTable：cell / empty state slots（full replace）

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

### Workflow cards：actions / status slots（full replace）

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

### Render hooks：formatter / URL sanitizer / markdown / highlight / props sanitizer

Render hooks 用于“数据级扩展点”：宿主可以在不修改 `sharedState.ui` 的前提下，统一注入格式化、安全策略与富文本渲染。

```ts
import { createHost, createRegistry, defaultRenderHooks, viewerRegistryV1, workflowRegistryV1 } from 'rivu-react';

const registry = createRegistry({ ...viewerRegistryV1, ...workflowRegistryV1 });

const host = createHost({
  registry,
  renderHooks: {
    // 1) value formatting（示例：固定 en-US + 货币）
    formatNumber: (value) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value),
    formatCurrency: (value, meta) => new Intl.NumberFormat('en-US', { style: 'currency', currency: meta.currency }).format(value),

    // 2) URL sanitizer（默认策略：仅允许 http(s)/mailto；其余返回 null 并在组件中被阻止）
    sanitizeUrl: (rawUrl) => {
      const url = defaultRenderHooks.sanitizeUrl(rawUrl);
      // 例：只允许 https
      return url?.startsWith('https:') ? url : null;
    },

    // 3) markdown/highlight（可选）
    // 注意：若你返回 HTML，必须在宿主侧自行 sanitize（否则可能 XSS）。
    renderMarkdown: (markdown) => markdown,
    highlightCode: (code) => code,

    // 4) component props sanitizer（可选，pre-render，host-only，不写入协议）
    sanitizeComponentProps: (meta, props) => {
      // 例：统一去掉危险字段（按 componentType/路径裁剪）
      return props;
    },
  },
});
```

> 安全注意：`renderMarkdown/highlightCode` 的默认实现是“纯文本/不高亮”，确保不会注入 HTML。宿主若自行渲染 markdown → HTML，**必须自己做 HTML sanitization**。

## 3) Svelte 说明

Rivu 的 tokens 是纯 CSS variables，因此跨框架一致。  
Svelte 侧的 slots 形式可以 idiomatic（原生 `<slot>` / props），但语义建议与 React 对齐：
- DataTable：支持 cell 渲染与 empty state 替换
- Workflow cards：支持 actions/status 区域替换

## 4) 融入流行 UI 库（Material UI / shadcn 风格）

Rivu 的官方 UI kit 只依赖 `--rivu-*` CSS variables，因此你可以把它映射到任意宿主 UI 库的主题系统，让“外壳 UI”与 Rivu 内部卡片保持一致。

### Material UI（MUI）映射示例

推荐做法是在你的 App 根节点（或嵌入容器）上设置一组 `--rivu-*` 变量，值来自 MUI theme：

```tsx
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';

function RivuTokenBridge({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <div
      style={{
        ['--rivu-bg' as any]: theme.palette.background.paper,
        ['--rivu-bg-muted' as any]: theme.palette.action.hover,
        ['--rivu-fg' as any]: theme.palette.text.primary,
        ['--rivu-fg-muted' as any]: theme.palette.text.secondary,
        ['--rivu-muted' as any]: theme.palette.text.secondary,
        ['--rivu-font-family' as any]: theme.typography.fontFamily,
        ['--rivu-font-size-sm' as any]: theme.typography.caption.fontSize,
        ['--rivu-font-size-base' as any]: theme.typography.body1.fontSize,
        ['--rivu-space-2' as any]: theme.spacing(1),
        ['--rivu-space-3' as any]: theme.spacing(1.5),
        ['--rivu-space-4' as any]: theme.spacing(1.75),
        ['--rivu-border' as any]: theme.palette.divider,
        ['--rivu-border-muted' as any]: theme.palette.divider,
        ['--rivu-shadow' as any]: theme.shadows[1],
        ['--rivu-radius' as any]: `${theme.shape.borderRadius + 6}px`,
        ['--rivu-radius-sm' as any]: `${theme.shape.borderRadius}px`,
      }}
    >
      {children}
    </div>
  );
}

const muiTheme = createTheme({ palette: { mode: 'light' } });

export function App() {
  return (
    <ThemeProvider theme={muiTheme}>
      <RivuTokenBridge>{/* mount your Rivu renderer here */}</RivuTokenBridge>
    </ThemeProvider>
  );
}
```

> 提示：图表 palette（`--rivu-chart-*`）也可以从 MUI 的品牌色派生，或直接绑定到你的 design system chart tokens。

### shadcn 风格（Tailwind CSS variables）映射示例

shadcn 常用的主题变量是 `--background/--foreground/--muted/--border` 等。你可以把它们转接到 `--rivu-*`：

```css
:root {
  --rivu-bg: hsl(var(--background));
  --rivu-bg-muted: hsl(var(--muted));
  --rivu-bg-subtle: hsl(var(--muted) / 0.7);
  --rivu-fg: hsl(var(--foreground));
  --rivu-fg-muted: hsl(var(--muted-foreground));
  --rivu-muted: hsl(var(--muted-foreground));
  --rivu-font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
  --rivu-font-size-sm: 0.75rem; /* 12px */
  --rivu-font-size-base: 0.875rem; /* 14px */
  --rivu-space-2: 0.5rem; /* 8px */
  --rivu-space-3: 0.75rem; /* 12px */
  --rivu-space-4: 0.875rem; /* 14px */
  --rivu-border: hsl(var(--border));
  --rivu-border-muted: hsl(var(--border));
  --rivu-radius: 14px;
  --rivu-radius-sm: 10px;
}

.dark {
  /* shadcn 的 .dark 会切换这些变量，rivu 会自动跟随 */
}
```

这样 Rivu 组件就会自然融入你已有的 Card / Button / Typography 风格里（尤其是边框、背景、圆角、暗色策略与图表配色）。
