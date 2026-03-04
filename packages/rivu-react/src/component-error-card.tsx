import type { CSSProperties } from 'react';

export type ComponentErrorV1 = {
  code: string;
  message: string;
  details?: Record<string, unknown> | undefined;
};

export type ComponentErrorCardProps = {
  title?: string;
  componentId?: string;
  componentType?: string;
  error?: ComponentErrorV1 | null;
  className?: string;
  style?: CSSProperties;
};

export function ComponentErrorCard(props: ComponentErrorCardProps) {
  const header = props.title ?? 'Component error';
  const errorLine = props.error ? `${props.error.code}: ${props.error.message}` : 'Unknown error';

  return (
    <div
      data-testid="rivu-component-error-card"
      className={props.className}
      style={{
        border: '1px solid var(--rivu-border, #e5e7eb)',
        borderRadius: 'var(--rivu-radius, 14px)',
        padding: 'var(--rivu-space-4, 14px)',
        background: 'var(--rivu-bg, #fff)',
        boxShadow: 'var(--rivu-shadow, none)',
        fontSize: 'var(--rivu-font-size-sm, 12px)',
        color: 'var(--rivu-fg, #111827)',
        ...props.style,
      }}
    >
      <div style={{ fontWeight: 750 }}>{header}</div>
      {props.componentId || props.componentType ? (
        <div style={{ marginTop: 6, color: 'var(--rivu-fg-muted, #374151)' }}>
          {props.componentId ? <span>id: {props.componentId}</span> : null}
          {props.componentType ? <span>{props.componentId ? ' • ' : ''}type: {props.componentType}</span> : null}
        </div>
      ) : null}

      <div style={{ marginTop: 10, color: 'var(--rivu-chart-4, #991b1b)', fontWeight: 650 }}>{errorLine}</div>

      {props.error?.details ? (
        <pre
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 'var(--rivu-radius-sm, 10px)',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            background: 'var(--rivu-bg-muted, #fafafa)',
            color: 'var(--rivu-fg-muted, #374151)',
          }}
        >
          {JSON.stringify(props.error.details, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
