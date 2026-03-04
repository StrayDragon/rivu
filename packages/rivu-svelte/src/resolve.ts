import { selectUiComponentV1, selectUiDatasetV1, type RivuKernelState } from 'rivu-kernel';

import type { RivuSvelteComponentRegistry, RivuSvelteHost } from './registry.js';
import type { RivuComponentMeta } from './render-hooks.js';

export type ResolveUiComponentResult =
  | {
      status: 'ok';
      host: RivuSvelteHost;
      componentId: string;
      componentType: string;
      schemaVersion: number;
      revision: number;
      hasState: boolean;
      Component: RivuSvelteComponentRegistry[string]['Component'];
      props: unknown;
      state: unknown;
    }
  | {
      status: 'building';
      host: RivuSvelteHost;
      componentId: string;
      componentType: string;
      schemaVersion: number;
      revision: number;
      hasState: boolean;
    }
  | {
      status: 'error';
      host: RivuSvelteHost;
      componentId: string;
      componentType: string;
      schemaVersion: number;
      revision: number;
      hasState: boolean;
      error: any;
    }
  | { status: 'not_found' | 'unknown_type' | 'schema_mismatch' | 'invalid_props' | 'invalid_state'; details: any };

export function resolveUiComponentV1(params: {
  state: RivuKernelState;
  host: RivuSvelteHost;
  componentId: string;
}): ResolveUiComponentResult {
  const component = selectUiComponentV1(params.state, params.componentId);
  if (!component) return { status: 'not_found', details: { componentId: params.componentId } };

  const registration = params.host.registry[component.type];
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

  const lifecycleStatus = component.status ?? 'ready';
  if (lifecycleStatus === 'error') {
    return {
      status: 'error',
      host: params.host,
      componentId: params.componentId,
      componentType: component.type,
      schemaVersion: component.schemaVersion,
      revision: component.revision,
      hasState: component.state != null,
      error: (component as any).error ?? null,
    };
  }
  if (lifecycleStatus === 'building') {
    return {
      status: 'building',
      host: params.host,
      componentId: params.componentId,
      componentType: component.type,
      schemaVersion: component.schemaVersion,
      revision: component.revision,
      hasState: component.state != null,
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

  const dataRefResolution:
    | { ok: true; props: unknown }
    | { ok: false; reason: string; details: Record<string, unknown> } = (() => {
    const props = propsResult.data as any;
    if (!props || typeof props !== 'object' || Array.isArray(props)) return { ok: true, props: propsResult.data };
    const dataRef = (props as any).dataRef;
    if (!dataRef || typeof dataRef !== 'object' || Array.isArray(dataRef)) return { ok: true, props: propsResult.data };
    const datasetId = (dataRef as any).datasetId;
    if (typeof datasetId !== 'string' || !datasetId.trim()) {
      return { ok: false, reason: 'dataRef_invalid', details: { datasetId } };
    }

    const dataset = selectUiDatasetV1(params.state, datasetId);
    if (!dataset) return { ok: false, reason: 'dataset_not_found', details: { datasetId } };

    if (component.type === 'DataTable') {
      const columns = (props as any).columns;
      if (!Array.isArray(columns)) return { ok: false, reason: 'dataTable_columns_invalid', details: { datasetId } };

      const indexes = new Map(dataset.columns.map((name, i) => [name, i] as const));
      const missingColumns = columns
        .filter(
          (c) =>
            !c ||
            typeof c !== 'object' ||
            Array.isArray(c) ||
            typeof (c as any).key !== 'string' ||
            !indexes.has((c as any).key),
        )
        .map((c) => (c as any)?.key);
      if (missingColumns.length > 0) {
        return {
          ok: false,
          reason: 'dataset_column_mismatch',
          details: { datasetId, missingColumns, datasetColumns: dataset.columns },
        };
      }

      const rows = dataset.rows.map((row) => {
        const out: Record<string, string | number | null> = {};
        for (const col of columns) {
          out[(col as any).key] = (row[indexes.get((col as any).key)!] as any) ?? null;
        }
        return out;
      });

      return { ok: true, props: { ...props, rows } };
    }

    if (component.type === 'BarChart') {
      const labelIndex = dataset.columns.indexOf('label');
      const valueIndex = dataset.columns.indexOf('value');
      if (labelIndex < 0 || valueIndex < 0) {
        return {
          ok: false,
          reason: 'dataset_column_mismatch',
          details: { datasetId, requiredColumns: ['label', 'value'], datasetColumns: dataset.columns },
        };
      }

      const items = dataset.rows
        .map((row) => ({ label: row[labelIndex], value: row[valueIndex] }))
        .filter((item): item is { label: string; value: number } => typeof item.label === 'string' && item.label.trim() !== '' && typeof item.value === 'number' && Number.isFinite(item.value))
        .map((item) => ({ label: item.label, value: item.value }));

      return { ok: true, props: { ...props, items } };
    }

    return { ok: true, props: propsResult.data };
  })();

  if (!dataRefResolution.ok) {
    return {
      status: 'invalid_props',
      details: {
        componentId: params.componentId,
        componentType: component.type,
        reason: dataRefResolution.reason,
        ...dataRefResolution.details,
      },
    };
  }

  const meta: RivuComponentMeta = {
    componentId: params.componentId,
    componentType: component.type,
    schemaVersion: component.schemaVersion,
  };

  let sanitizedProps = dataRefResolution.props;
  try {
    if (params.host.renderHooks.sanitizeComponentProps) {
      sanitizedProps = params.host.renderHooks.sanitizeComponentProps(meta, dataRefResolution.props as any);
    }
  } catch (err) {
    return {
      status: 'invalid_props',
      details: {
        componentId: params.componentId,
        componentType: component.type,
        reason: 'blocked_by_sanitizer',
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }

  return {
    status: 'ok',
    host: params.host,
    componentId: params.componentId,
    componentType: component.type,
    schemaVersion: component.schemaVersion,
    revision: component.revision,
    hasState: component.state != null,
    Component: registration.Component,
    props: sanitizedProps,
    state: stateResult ? stateResult.data : undefined,
  };
}
