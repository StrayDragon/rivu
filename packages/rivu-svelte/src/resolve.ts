import { selectUiComponentV1, type RivuKernelState } from 'rivu-kernel';

import type { RivuSvelteComponentRegistry } from './registry.js';

export type ResolveUiComponentResult =
  | {
      status: 'ok';
      componentId: string;
      componentType: string;
      schemaVersion: number;
      Component: RivuSvelteComponentRegistry[string]['Component'];
      props: unknown;
      state: unknown;
    }
  | { status: 'not_found' | 'unknown_type' | 'schema_mismatch' | 'invalid_props' | 'invalid_state'; details: any };

export function resolveUiComponentV1(params: {
  state: RivuKernelState;
  registry: RivuSvelteComponentRegistry;
  componentId: string;
}): ResolveUiComponentResult {
  const component = selectUiComponentV1(params.state, params.componentId);
  if (!component) return { status: 'not_found', details: { componentId: params.componentId } };

  const registration = params.registry[component.type];
  if (!registration) {
    return {
      status: 'unknown_type',
      details: { componentId: params.componentId, componentType: component.type, schemaVersion: component.schemaVersion },
    };
  }

  if (registration.schemaVersion !== component.schemaVersion) {
    return {
      status: 'schema_mismatch',
      details: {
        componentId: params.componentId,
        componentType: component.type,
        expectedSchemaVersion: registration.schemaVersion,
        gotSchemaVersion: component.schemaVersion,
      },
    };
  }

  const propsResult = registration.propsSchema.safeParse(component.props);
  if (!propsResult.success) {
    return {
      status: 'invalid_props',
      details: { componentId: params.componentId, componentType: component.type, issues: propsResult.error.issues },
    };
  }

  const stateResult = registration.stateSchema ? registration.stateSchema.safeParse(component.state ?? {}) : null;
  if (stateResult && !stateResult.success) {
    return {
      status: 'invalid_state',
      details: { componentId: params.componentId, componentType: component.type, issues: stateResult.error.issues },
    };
  }

  return {
    status: 'ok',
    componentId: params.componentId,
    componentType: component.type,
    schemaVersion: component.schemaVersion,
    Component: registration.Component,
    props: propsResult.data,
    state: stateResult ? stateResult.data : undefined,
  };
}
