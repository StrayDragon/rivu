import type { ReactNode } from 'react';

export type RivuComponentMeta = {
  componentId: string;
  componentType: string;
  schemaVersion: number;
};

export type RivuFormatMeta = {
  componentId: string;
  componentType: string;
  path?: string;
  unit?: string;
};

export type RivuMarkdownMeta = {
  componentId: string;
  componentType: string;
  path?: string;
};

export type RivuCodeMeta = {
  componentId: string;
  componentType: string;
  path?: string;
  language?: string;
};

export type RivuRenderHooks = {
  sanitizeUrl: (rawUrl: string) => string | null;
  formatNumber: (value: number, meta: RivuFormatMeta) => string;
  formatDateTime: (value: Date | number | string, meta: RivuFormatMeta) => string;
  formatCurrency: (value: number, meta: RivuFormatMeta & { currency: string }) => string;
  formatPercent: (value: number, meta: RivuFormatMeta) => string;
  formatValue: (value: unknown, meta: RivuFormatMeta) => string;
  renderMarkdown: (markdown: string, meta: RivuMarkdownMeta) => ReactNode;
  highlightCode: (code: string, meta: RivuCodeMeta) => ReactNode;
  sanitizeComponentProps?: <TProps extends Record<string, unknown>>(meta: RivuComponentMeta, props: TProps) => TProps;
};

function defaultSanitizeUrl(rawUrl: string): string | null {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    const url = new URL(trimmed);
    const protocol = url.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:' && protocol !== 'mailto:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const defaultRenderHooks: RivuRenderHooks = {
  sanitizeUrl: defaultSanitizeUrl,
  formatNumber: (value) => value.toLocaleString(),
  formatDateTime: (value) => {
    const d = value instanceof Date ? value : new Date(value);
    return Number.isFinite(d.getTime()) ? d.toLocaleString() : String(value);
  },
  formatCurrency: (value, meta) => {
    // Keep the default deterministic-ish and locale-friendly without assuming a fixed locale.
    // `Intl.NumberFormat` percent/currency semantics differ by input scale; callers should
    // use this hook only when they mean currency.
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: meta.currency }).format(value);
    } catch {
      return value.toLocaleString();
    }
  },
  formatPercent: (value) => {
    // `value` is expected to be percentage points (e.g. 1.23 => "1.23%").
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  },
  formatValue: (value, meta) => {
    if (typeof value === 'number' && Number.isFinite(value)) return defaultRenderHooks.formatNumber(value, meta);
    if (typeof value === 'string') return value;
    if (value === null) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  },
  renderMarkdown: (markdown) => markdown,
  highlightCode: (code) => code,
};

export function mergeRenderHooks(overrides?: Partial<RivuRenderHooks>): RivuRenderHooks {
  if (!overrides) return defaultRenderHooks;
  return {
    ...defaultRenderHooks,
    ...overrides,
  };
}
