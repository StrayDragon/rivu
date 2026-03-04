import type { CSSProperties } from 'react';

export type ComponentSkeletonProps = {
  title?: string;
  className?: string;
  style?: CSSProperties;
};

export function ComponentSkeleton(props: ComponentSkeletonProps) {
  const lineStyle: CSSProperties = {
    height: 10,
    borderRadius: 999,
    background: 'var(--rivu-bg-subtle, #f3f4f6)',
  };

  return (
    <div
      data-testid="rivu-component-skeleton"
      className={props.className}
      style={{
        border: '1px solid var(--rivu-border, #e5e7eb)',
        borderRadius: 'var(--rivu-radius, 14px)',
        padding: 'var(--rivu-space-4, 14px)',
        background: 'var(--rivu-bg, #fff)',
        boxShadow: 'var(--rivu-shadow, none)',
        ...props.style,
      }}
    >
      {props.title ? (
        <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', fontWeight: 650, color: 'var(--rivu-fg-muted, #374151)' }}>
          {props.title}
        </div>
      ) : null}
      <div style={{ marginTop: props.title ? 10 : 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ ...lineStyle, width: '55%' }} />
        <div style={{ ...lineStyle, width: '85%' }} />
        <div style={{ ...lineStyle, width: '70%' }} />
      </div>
    </div>
  );
}
