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

    for (const env of params.bootstrapEnvelopes) {
      emit(env.event);
      seq = env.seq;
    }
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
          throw new Error('payload.selection.kind must be one of \"none\"|\"point\"|\"range\"|\"series\"');
        }

        state.selection = nextSelection;
      } else {
        throw new Error(`unsupported Chart eventName: ${value.eventName}`);
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

  return {
    bootstrap,
    actionTransport,
    capabilitiesTransport,
    getSharedState: () => sharedState,
  };
}

