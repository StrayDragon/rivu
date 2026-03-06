import type { CSSProperties } from 'react';

export type RivuSlotPropOverrides = {
  className?: string;
  style?: CSSProperties;
  [attr: string]: unknown;
};

export type RivuSlotProps = {
  DataTable?: {
    root?: RivuSlotPropOverrides;
    caption?: RivuSlotPropOverrides;
    table?: RivuSlotPropOverrides;
    thead?: RivuSlotPropOverrides;
    th?: RivuSlotPropOverrides;
    tbody?: RivuSlotPropOverrides;
    tr?: RivuSlotPropOverrides;
    td?: RivuSlotPropOverrides;
    emptyState?: RivuSlotPropOverrides;
  };
  PivotTable?: {
    root?: RivuSlotPropOverrides;
    title?: RivuSlotPropOverrides;
    table?: RivuSlotPropOverrides;
    thead?: RivuSlotPropOverrides;
    th?: RivuSlotPropOverrides;
    tbody?: RivuSlotPropOverrides;
    tr?: RivuSlotPropOverrides;
    td?: RivuSlotPropOverrides;
  };
  Heatmap?: {
    root?: RivuSlotPropOverrides;
    title?: RivuSlotPropOverrides;
    grid?: RivuSlotPropOverrides;
    th?: RivuSlotPropOverrides;
    td?: RivuSlotPropOverrides;
    cell?: RivuSlotPropOverrides;
  };
  ApprovalCard?: {
    root?: RivuSlotPropOverrides;
    status?: RivuSlotPropOverrides;
    actions?: RivuSlotPropOverrides;
    approveButton?: RivuSlotPropOverrides;
    denyButton?: RivuSlotPropOverrides;
  };
  ConfirmCard?: {
    root?: RivuSlotPropOverrides;
    status?: RivuSlotPropOverrides;
    actions?: RivuSlotPropOverrides;
    confirmButton?: RivuSlotPropOverrides;
    cancelButton?: RivuSlotPropOverrides;
  };
  TaskStatusCard?: {
    root?: RivuSlotPropOverrides;
    status?: RivuSlotPropOverrides;
    progress?: RivuSlotPropOverrides;
    message?: RivuSlotPropOverrides;
  };
  FormCard?: {
    root?: RivuSlotPropOverrides;
    status?: RivuSlotPropOverrides;
    fields?: RivuSlotPropOverrides;
    field?: RivuSlotPropOverrides;
    actions?: RivuSlotPropOverrides;
    submitButton?: RivuSlotPropOverrides;
  };
  MultiStepWizard?: {
    root?: RivuSlotPropOverrides;
    header?: RivuSlotPropOverrides;
    title?: RivuSlotPropOverrides;
    description?: RivuSlotPropOverrides;
    stepper?: RivuSlotPropOverrides;
    step?: RivuSlotPropOverrides;
    fields?: RivuSlotPropOverrides;
    field?: RivuSlotPropOverrides;
    status?: RivuSlotPropOverrides;
    actions?: RivuSlotPropOverrides;
    prevButton?: RivuSlotPropOverrides;
    nextButton?: RivuSlotPropOverrides;
    submitButton?: RivuSlotPropOverrides;
    resetButton?: RivuSlotPropOverrides;
  };
  FileUploadCard?: {
    root?: RivuSlotPropOverrides;
    picker?: RivuSlotPropOverrides;
    list?: RivuSlotPropOverrides;
    listItem?: RivuSlotPropOverrides;
    removeButton?: RivuSlotPropOverrides;
    actions?: RivuSlotPropOverrides;
    submitButton?: RivuSlotPropOverrides;
  };
};

function mergeClassName(base?: string, extra?: string): string | undefined {
  if (base && extra) return `${base} ${extra}`;
  return base ?? extra;
}

export function applySlotProps<T extends { className?: string | undefined; style?: CSSProperties | undefined }>(
  base: T,
  overrides?: RivuSlotPropOverrides,
): T & Record<string, any> {
  if (!overrides) return base as any;

  const { className, style, ...rest } = overrides;

  return {
    ...(base as any),
    ...rest,
    className: mergeClassName(base.className, className),
    style: style ? { ...(base.style ?? {}), ...style } : base.style,
  };
}
