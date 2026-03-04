import type { RivuEnvelope, RivuKernel } from 'rivu-kernel';
import type { UiV1CapabilitiesCustomEvent, UiV1CustomEvent } from 'rivu-ui-spec';

type JsonPatchOp =
  | { op: 'add' | 'replace'; path: string; value: unknown }
  | { op: 'remove'; path: string };

type ProcessResult = {
  patch: JsonPatchOp[];
  componentId: string;
  clientRequestId: string;
  newRevision: number;
};

function encodePointer(token: string) {
  return token.replaceAll('~', '~0').replaceAll('/', '~1');
}

function nowMs() {
  return Date.now();
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function assertRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
}

export type MockServer = {
  bootstrap: () => void;
  actionTransport: (action: UiV1CustomEvent) => Promise<void>;
  capabilitiesTransport: (capabilities: UiV1CapabilitiesCustomEvent) => Promise<void>;
  setDatasetRows: (datasetId: string, rows: Array<Array<string | number | null>>) => void;
  getSharedState: () => Record<string, unknown>;
};

export function createMockServer(params: {
  kernel: RivuKernel;
  bootstrapEnvelopes: RivuEnvelope[];
  initialSharedState: Record<string, unknown>;
}): MockServer {
  const kernel = params.kernel;

  let seq = 0;
  let sharedState: Record<string, unknown> = structuredClone(params.initialSharedState);
  const idempotency = new Map<string, ProcessResult>();
  let lifecycleTimeouts: number[] = [];

  const emit = (event: unknown) => {
    seq += 1;
    const result = kernel.dispatch({ seq, event });
    if (result.status === 'gap' || result.status === 'needs_resync') {
      throw new Error(`kernel rejected event seq=${seq}: ${result.status}`);
    }
  };

  const bootstrap = () => {
    seq = 0;
    sharedState = structuredClone(params.initialSharedState);
    idempotency.clear();
    for (const t of lifecycleTimeouts) clearTimeout(t);
    lifecycleTimeouts = [];

    for (const env of params.bootstrapEnvelopes) {
      emit(env.event);
      seq = env.seq;
    }

    // Demo: lifecycle streaming example (building -> ready via multi-step patches).
    const uiRaw = (sharedState as any).ui as unknown;
    if (!uiRaw || typeof uiRaw !== 'object' || Array.isArray(uiRaw)) return;
    const componentsRaw = (uiRaw as any).components as unknown;
    if (!componentsRaw || typeof componentsRaw !== 'object' || Array.isArray(componentsRaw)) return;

    const lifecycleId = 'cmp_lifecycle_metric';
    const lifecycleComponent = (componentsRaw as any)[lifecycleId] as any;
    if (!lifecycleComponent) return;

    const ptr = encodePointer(lifecycleId);
    const emitDelta = (delta: JsonPatchOp[]) => emit({ type: 'STATE_DELTA', delta });

    // 1) Patch in partial props while still building.
    lifecycleTimeouts.push(
      window.setTimeout(() => {
        lifecycleComponent.props = { ...(lifecycleComponent.props ?? {}), label: 'Streaming MetricCard', note: 'building → ready (demo)' };
        emitDelta([
          { op: 'add', path: `/ui/components/${ptr}/props/label`, value: 'Streaming MetricCard' },
          { op: 'add', path: `/ui/components/${ptr}/props/note`, value: 'building → ready (demo)' },
        ]);
      }, 350),
    );

    // 2) Patch more props.
    lifecycleTimeouts.push(
      window.setTimeout(() => {
        lifecycleComponent.props = { ...(lifecycleComponent.props ?? {}), value: 42_000, unit: 'USD', changePercent: 1.23 };
        emitDelta([
          { op: 'add', path: `/ui/components/${ptr}/props/value`, value: 42_000 },
          { op: 'add', path: `/ui/components/${ptr}/props/unit`, value: 'USD' },
          { op: 'add', path: `/ui/components/${ptr}/props/changePercent`, value: 1.23 },
        ]);
      }, 700),
    );

    // 3) Flip to ready (strict validation + real render).
    lifecycleTimeouts.push(
      window.setTimeout(() => {
        lifecycleComponent.status = 'ready';
        emitDelta([{ op: 'replace', path: `/ui/components/${ptr}/status`, value: 'ready' }]);
      }, 1050),
    );
  };

  const processUiV1Event = (action: UiV1CustomEvent): ProcessResult => {
    const value = action.value;
    const existing = idempotency.get(value.clientRequestId);
    if (existing) return existing;

    const uiRaw = (sharedState as any).ui as unknown;
    assertRecord(uiRaw, 'shared_state.ui is missing');
    const componentsRaw = (uiRaw as any).components as unknown;
    assertRecord(componentsRaw, 'shared_state.ui.components is missing');

    const component = (componentsRaw as any)[value.componentId] as any;
    if (!component) throw new Error(`component not found: ${value.componentId}`);

    const currentRevision = Number(component.revision ?? 0);
    if (!Number.isInteger(currentRevision) || currentRevision < 0) throw new Error('component.revision must be a non-negative int');
    if (value.baseRevision !== currentRevision) {
      throw new Error(`revision conflict: baseRevision=${value.baseRevision} currentRevision=${currentRevision}`);
    }

    const componentType = String(component.type ?? '');
    const state = { ...(component.state ?? {}) } as Record<string, unknown>;

    if (componentType === 'ApprovalCard') {
      if (value.eventName !== 'approve' && value.eventName !== 'deny') {
        throw new Error(`unsupported ApprovalCard eventName: ${value.eventName}`);
      }
      state.status = value.eventName === 'approve' ? 'approved' : 'denied';
      if (typeof state.decidedAtMs !== 'number') state.decidedAtMs = nowMs();
      state.decidedBy = 'demo-server';
    } else if (componentType === 'Chart') {
      if (value.eventName === 'chart.clearSelection') {
        state.selection = { kind: 'none' };
      } else if (value.eventName === 'chart.setSelection') {
        const payload = value.payload as unknown;
        assertRecord(payload, 'payload must be an object');
        const selection = (payload as any).selection as unknown;
        assertRecord(selection, 'payload.selection must be an object');

        const kind = String((selection as any).kind ?? '');

        let nextSelection: Record<string, unknown>;
        if (kind === 'none') {
          nextSelection = { kind: 'none' };
        } else if (kind === 'point') {
          const rowIndex = (selection as any).rowIndex as unknown;
          if (typeof rowIndex !== 'number' || !Number.isInteger(rowIndex) || rowIndex < 0) {
            throw new Error('payload.selection.rowIndex must be a non-negative integer');
          }

          const data = (component.props as any).data as unknown;
          assertRecord(data, 'Chart props.data must be an object');
          const rows = (data as any).rows as unknown;
          if (!Array.isArray(rows)) throw new Error('Chart props.data.rows must be an array');

          if (rowIndex >= rows.length) {
            throw new Error(`payload.selection.rowIndex out of range: rowIndex=${rowIndex} rows=${rows.length}`);
          }

          nextSelection = { kind: 'point', rowIndex };
        } else if (kind === 'range') {
          const column = (selection as any).column as unknown;
          if (typeof column !== 'string' || !column.trim()) throw new Error('payload.selection.column must be a non-empty string');
          const from = (selection as any).from as unknown;
          const to = (selection as any).to as unknown;
          if (!(from === null || typeof from === 'string' || isFiniteNumber(from))) {
            throw new Error('payload.selection.from must be string|number|null');
          }
          if (!(to === null || typeof to === 'string' || isFiniteNumber(to))) {
            throw new Error('payload.selection.to must be string|number|null');
          }
          nextSelection = { kind: 'range', column, from, to };
        } else if (kind === 'series') {
          const seriesValue = (selection as any).value as unknown;
          if (!(typeof seriesValue === 'string' || isFiniteNumber(seriesValue))) {
            throw new Error('payload.selection.value must be string|number');
          }
          nextSelection = { kind: 'series', value: seriesValue };
        } else {
          throw new Error('payload.selection.kind must be one of "none"|"point"|"range"|"series"');
        }

        state.selection = nextSelection;
      } else {
        throw new Error(`unsupported Chart eventName: ${value.eventName}`);
      }
    } else if (componentType === 'FormCard') {
      const valuesState = { ...((state.values as any) ?? {}) } as Record<string, unknown>;
      if (value.eventName === 'setField') {
        const fieldId = (value.payload as any).fieldId as unknown;
        if (typeof fieldId !== 'string' || !fieldId.trim()) throw new Error('payload.fieldId must be a non-empty string');
        valuesState[fieldId] = (value.payload as any).value;
        state.values = valuesState;
        const errorsState = { ...((state.errors as any) ?? {}) } as Record<string, unknown>;
        delete errorsState[fieldId];
        state.errors = errorsState;
      } else if (value.eventName === 'submit') {
        const submittedValues = (value.payload as any).values;
        if (submittedValues && typeof submittedValues === 'object' && !Array.isArray(submittedValues)) {
          state.values = { ...valuesState, ...(submittedValues as Record<string, unknown>) };
        } else {
          state.values = valuesState;
        }
        state.status = 'submitted';
      } else {
        throw new Error(`unsupported FormCard eventName: ${value.eventName}`);
      }
    } else {
      throw new Error(`unsupported component type: ${componentType}`);
    }

    const newRevision = currentRevision + 1;
    const componentIdPointer = encodePointer(value.componentId);
    const patch: JsonPatchOp[] = [
      { op: 'add', path: `/ui/components/${componentIdPointer}/state`, value: state },
      { op: 'replace', path: `/ui/components/${componentIdPointer}/revision`, value: newRevision },
    ];

    component.state = state;
    component.revision = newRevision;

    const result: ProcessResult = {
      patch,
      componentId: value.componentId,
      clientRequestId: value.clientRequestId,
      newRevision,
    };
    idempotency.set(value.clientRequestId, result);
    return result;
  };

  const actionTransport = async (action: UiV1CustomEvent) => {
    const result = processUiV1Event(action);
    emit({ type: 'STATE_DELTA', delta: result.patch });
  };

  const capabilitiesTransport = async (capabilities: UiV1CapabilitiesCustomEvent) => {
    // eslint-disable-next-line no-console
    console.log('[mock-server] received ui.v1.capabilities', capabilities.value);
  };

  const setDatasetRows = (datasetId: string, rows: Array<Array<string | number | null>>) => {
    const uiRaw = (sharedState as any).ui as unknown;
    assertRecord(uiRaw, 'shared_state.ui is missing');

    const datasetsRaw = (uiRaw as any).datasets as unknown;
    assertRecord(datasetsRaw, 'shared_state.ui.datasets is missing');

    const dataset = (datasetsRaw as any)[datasetId] as any;
    if (!dataset) throw new Error(`dataset not found: ${datasetId}`);

    dataset.rows = rows;

    const ptr = encodePointer(datasetId);
    emit({ type: 'STATE_DELTA', delta: [{ op: 'replace', path: `/ui/datasets/${ptr}/rows`, value: rows }] });
  };

  return {
    bootstrap,
    actionTransport,
    capabilitiesTransport,
    setDatasetRows,
    getSharedState: () => sharedState,
  };
}
