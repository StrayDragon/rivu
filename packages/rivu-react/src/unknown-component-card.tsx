import type { CSSProperties } from 'react';

export type UnknownComponentCardProps = {
  title?: string;
  componentId?: string;
  componentType?: string;
  schemaVersion?: number;
  details?: Record<string, unknown>;
  className?: string;
  style?: CSSProperties;
};

export function UnknownComponentCard(props: UnknownComponentCardProps) {
  return (
    <div
      className={props.className}
      style={{
        border: '1px solid var(--rivu-border, #e5e7eb)',
        borderRadius: 'var(--rivu-radius, 12px)',
        padding: 12,
        background: 'var(--rivu-bg-muted, #fafafa)',
        boxShadow: 'var(--rivu-shadow, none)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: 12,
        color: 'var(--rivu-fg, #111827)',
        ...props.style,
      }}
    >
      <div style={{ fontWeight: 600 }}>{props.title ?? 'Unknown component'}</div>
      {props.componentId || props.componentType || typeof props.schemaVersion === 'number' ? (
        <div style={{ marginTop: 6, color: 'var(--rivu-fg-muted, #374151)' }}>
          {props.componentId ? <span>id: {props.componentId}</span> : null}
          {props.componentType ? <span>{props.componentId ? ' • ' : ''}type: {props.componentType}</span> : null}
          {typeof props.schemaVersion === 'number' ? (
            <span>
              {(props.componentId || props.componentType) ? ' • ' : ''}v: {props.schemaVersion}
            </span>
          ) : null}
        </div>
      ) : null}
      {props.details ? (
        <pre
          style={{
            marginTop: 8,
            whiteSpace: 'pre-wrap',
            overflowX: 'auto',
            color: 'var(--rivu-fg-muted, #374151)',
          }}
        >
          {JSON.stringify(props.details, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
