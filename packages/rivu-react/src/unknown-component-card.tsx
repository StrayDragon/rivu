export type UnknownComponentCardProps = {
  title?: string;
  componentId?: string;
  componentType?: string;
  schemaVersion?: number;
  details?: Record<string, unknown>;
};

export function UnknownComponentCard(props: UnknownComponentCardProps) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 12,
        background: '#fafafa',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: 12,
        color: '#111827',
      }}
    >
      <div style={{ fontWeight: 600 }}>{props.title ?? 'Unknown component'}</div>
      {props.componentId || props.componentType || typeof props.schemaVersion === 'number' ? (
        <div style={{ marginTop: 6, color: '#374151' }}>
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
            color: '#374151',
          }}
        >
          {JSON.stringify(props.details, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
