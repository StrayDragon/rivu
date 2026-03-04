import type { RivuKernel } from 'rivu-kernel';
import { selectUiComponentV1 } from 'rivu-kernel';

import { useKernelState } from './use-kernel-state.js';
import { ComponentErrorCard } from './component-error-card.js';
import { ComponentSkeleton } from './component-skeleton.js';
import { UnknownComponentCard } from './unknown-component-card.js';
import { useRivuContext } from './provider.js';
import type { RivuHost } from './registry.js';
import type { RivuComponentMeta } from './render-hooks.js';

export type ComponentRendererProps = {
  componentId: string;
  kernel?: RivuKernel;
  host?: RivuHost;
};

function useResolvedParams(props: ComponentRendererProps): { kernel: RivuKernel; host: RivuHost } {
  if (props.kernel && props.host) return { kernel: props.kernel, host: props.host };
  const ctx = useRivuContext();
  return {
    kernel: props.kernel ?? ctx.kernel,
    host: props.host ?? ctx.host,
  };
}

export function ComponentRenderer(props: ComponentRendererProps) {
  const { kernel, host } = useResolvedParams(props);

  const component = useKernelState(kernel, (state) => selectUiComponentV1(state, props.componentId));

  if (!component) {
    return <UnknownComponentCard title="Component not found" componentId={props.componentId} details={{ componentId: props.componentId }} />;
  }

  const registration = host.registry[component.type];
  if (!registration) {
    return (
      <UnknownComponentCard
        title="Unknown component type"
        componentId={props.componentId}
        componentType={component.type}
        schemaVersion={component.schemaVersion}
        details={{ componentId: props.componentId, componentType: component.type, schemaVersion: component.schemaVersion }}
      />
    );
  }

  if (registration.schemaVersion !== component.schemaVersion) {
    return (
      <UnknownComponentCard
        title="Schema version mismatch"
        componentId={props.componentId}
        componentType={component.type}
        schemaVersion={component.schemaVersion}
        details={{
          componentId: props.componentId,
          componentType: component.type,
          expectedSchemaVersion: registration.schemaVersion,
          gotSchemaVersion: component.schemaVersion,
        }}
      />
    );
  }

  const lifecycleStatus = component.status ?? 'ready';
  if (lifecycleStatus === 'error') {
    return (
      <ComponentErrorCard
        componentId={props.componentId}
        componentType={component.type}
        error={component.error ?? null}
      />
    );
  }

  if (lifecycleStatus === 'building') {
    return <ComponentSkeleton />;
  }

  const propsResult = registration.propsSchema.safeParse(component.props);
  if (!propsResult.success) {
    return (
      <UnknownComponentCard
        title="Invalid component props"
        componentId={props.componentId}
        componentType={component.type}
        schemaVersion={component.schemaVersion}
        details={{
          componentId: props.componentId,
          componentType: component.type,
          issues: propsResult.error.issues,
        }}
      />
    );
  }

  const meta: RivuComponentMeta = {
    componentId: props.componentId,
    componentType: component.type,
    schemaVersion: component.schemaVersion,
  };

  let sanitizedProps = propsResult.data as any;
  try {
    if (host.renderHooks.sanitizeComponentProps) {
      sanitizedProps = host.renderHooks.sanitizeComponentProps(meta, propsResult.data as any);
    }
  } catch (err) {
    return (
      <UnknownComponentCard
        title="Component props blocked by host sanitizer"
        componentId={props.componentId}
        componentType={component.type}
        schemaVersion={component.schemaVersion}
        details={{
          componentId: props.componentId,
          componentType: component.type,
          error: err instanceof Error ? err.message : String(err),
        }}
      />
    );
  }

  const stateResult = registration.stateSchema ? registration.stateSchema.safeParse(component.state ?? {}) : null;
  if (stateResult && !stateResult.success) {
    return (
      <UnknownComponentCard
        title="Invalid component state"
        componentId={props.componentId}
        componentType={component.type}
        schemaVersion={component.schemaVersion}
        details={{
          componentId: props.componentId,
          componentType: component.type,
          issues: stateResult.error.issues,
        }}
      />
    );
  }

  return registration.render({
    kernel,
    host,
    componentId: props.componentId,
    componentType: component.type,
    schemaVersion: component.schemaVersion,
    revision: component.revision,
    props: sanitizedProps,
    state: stateResult ? stateResult.data : undefined,
  });
}
