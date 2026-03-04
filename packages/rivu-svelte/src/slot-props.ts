export type RivuSlotPropOverrides = {
  class?: string;
  style?: string;
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
  ApprovalCard?: {
    root?: RivuSlotPropOverrides;
    status?: RivuSlotPropOverrides;
    actions?: RivuSlotPropOverrides;
    approveButton?: RivuSlotPropOverrides;
    denyButton?: RivuSlotPropOverrides;
  };
  FormCard?: {
    root?: RivuSlotPropOverrides;
    status?: RivuSlotPropOverrides;
    fields?: RivuSlotPropOverrides;
    field?: RivuSlotPropOverrides;
    actions?: RivuSlotPropOverrides;
    submitButton?: RivuSlotPropOverrides;
  };
};

function mergeClass(base?: string, extra?: string): string | undefined {
  if (base && extra) return `${base} ${extra}`;
  return base ?? extra;
}

function mergeStyle(base?: string, extra?: string): string | undefined {
  if (base && extra) return `${base}; ${extra}`;
  return base ?? extra;
}

export function applySlotProps<T extends { class?: string | undefined; style?: string | undefined }>(
  base: T,
  overrides?: RivuSlotPropOverrides,
): T & Record<string, any> {
  if (!overrides) return base as any;

  const { class: classOverride, style: styleOverride, ...rest } = overrides;

  return {
    ...(base as any),
    ...rest,
    class: mergeClass((base as any).class, classOverride),
    style: mergeStyle((base as any).style, styleOverride),
  };
}
