import { EventSchemas } from '@ag-ui/core';
import * as fastJsonPatch from 'fast-json-patch';
import {
  UI_V1_EVENT_NAME,
  type UiInputLimitsV1,
  uiV1CustomEventSchema,
  uiV1EventValueSchema,
  type UiV1CustomEvent,
} from 'rivu-ui-spec';

const { applyPatch } = fastJsonPatch;

export type RivuEnvelope = {
  seq: number;
  event: unknown;
};

export type RivuKernelMessageRole = 'developer' | 'system' | 'assistant' | 'user' | 'tool';

export type RivuKernelMessage = {
  id: string;
  role: RivuKernelMessageRole;
  content: string;
  status: 'streaming' | 'done';
};

export type RivuKernelToolCall = {
  id: string;
  name: string;
  parentMessageId: string | null;
  args: string;
  status: 'streaming' | 'done';
  resultMessageId: string | null;
};

export type OutboxEntry = {
  clientRequestId: string;
  status: 'pending' | 'acked' | 'failed';
  action: UiV1CustomEvent;
  createdAtMs: number;
  ackedAtMs: number | null;
  failedAtMs: number | null;
  error: unknown | null;
};

export type RivuKernelState = {
  lastSeq: number;
  needsResync: boolean;
  resyncReason: 'gap' | 'patch_error' | 'limit_exceeded' | null;
  gap: { expectedSeq: number; gotSeq: number } | null;
  limitExceeded: { limit: string; max: number; observed: number; path?: string } | null;
  sharedState: Record<string, unknown>;
  messages: Record<string, RivuKernelMessage>;
  messageOrder: string[];
  toolCalls: Record<string, RivuKernelToolCall>;
  toolCallOrder: string[];
  outbox: Record<string, OutboxEntry>;
};

export type DispatchResult =
  | { status: 'applied'; seq: number }
  | { status: 'duplicate'; seq: number }
  | { status: 'gap'; expectedSeq: number; gotSeq: number }
  | { status: 'invalid'; error: unknown }
  | { status: 'needs_resync'; reason: 'patch_error' | 'limit_exceeded' };

export type SendResult =
  | { status: 'sent'; clientRequestId: string }
  | { status: 'duplicate'; clientRequestId: string };

export type RivuKernelActionTransport = (action: UiV1CustomEvent) => Promise<void>;

export type RivuKernel = {
  dispatch: (envelope: RivuEnvelope) => DispatchResult;
  getState: () => RivuKernelState;
  subscribe: (listener: () => void) => () => void;
  send: (action: UiV1CustomEvent) => Promise<SendResult>;
};

export type CreateKernelOptions = {
  actionTransport?: RivuKernelActionTransport;
  allowedCustomEventNames?: ReadonlySet<string>;
  nowMs?: () => number;
  limits?: UiInputLimitsV1;
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function defaultNowMs() {
  return Date.now();
}

function initialState(): RivuKernelState {
  return {
    lastSeq: 0,
    needsResync: false,
    resyncReason: null,
    gap: null,
    limitExceeded: null,
    sharedState: {},
    messages: {},
    messageOrder: [],
    toolCalls: {},
    toolCallOrder: [],
    outbox: {},
  };
}

export function createKernel(options: CreateKernelOptions = {}): RivuKernel {
  const nowMs = options.nowMs ?? defaultNowMs;
  const allowedCustomEventNames = options.allowedCustomEventNames ?? new Set([UI_V1_EVENT_NAME]);
  const actionTransport = options.actionTransport ?? null;
  const limits = options.limits ?? null;

  let state = initialState();
  const listeners = new Set<() => void>();
  const sendPromisesByRequestId = new Map<string, Promise<SendResult>>();

  function emit() {
    for (const listener of listeners) listener();
  }

  function setState(next: RivuKernelState) {
    state = next;
    emit();
  }

  function withMessage(prev: RivuKernelState, nextMessage: RivuKernelMessage): RivuKernelState {
    const exists = prev.messages[nextMessage.id] != null;
    return {
      ...prev,
      messages: { ...prev.messages, [nextMessage.id]: nextMessage },
      messageOrder: exists ? prev.messageOrder : [...prev.messageOrder, nextMessage.id],
    };
  }

  function withToolCall(prev: RivuKernelState, nextToolCall: RivuKernelToolCall): RivuKernelState {
    const exists = prev.toolCalls[nextToolCall.id] != null;
    return {
      ...prev,
      toolCalls: { ...prev.toolCalls, [nextToolCall.id]: nextToolCall },
      toolCallOrder: exists ? prev.toolCallOrder : [...prev.toolCallOrder, nextToolCall.id],
    };
  }

  function dispatch(envelope: RivuEnvelope): DispatchResult {
    const seq = envelope.seq;
    if (!Number.isInteger(seq) || seq <= 0) {
      return { status: 'invalid', error: new Error('seq must be a positive integer') };
    }

    if (seq <= state.lastSeq) return { status: 'duplicate', seq };
    if (seq > state.lastSeq + 1) {
      setState({
        ...state,
        needsResync: true,
        resyncReason: 'gap',
        gap: { expectedSeq: state.lastSeq + 1, gotSeq: seq },
        limitExceeded: null,
      });
      return { status: 'gap', expectedSeq: state.lastSeq + 1, gotSeq: seq };
    }

    const parsed = (EventSchemas as any).safeParse(envelope.event) as
      | { success: true; data: { type: string; [k: string]: unknown } }
      | { success: false; error: unknown };

    if (!parsed.success) {
      return { status: 'invalid', error: parsed.error };
    }

    const event = parsed.data;

    if (event.type === 'CUSTOM') {
      const name = (event as any).name as unknown;
      if (typeof name !== 'string') {
        return { status: 'invalid', error: new Error('CUSTOM.name must be a string') };
      }
      if (!allowedCustomEventNames.has(name)) {
        return { status: 'invalid', error: new Error(`unsupported custom event name: ${name}`) };
      }
      if (name === UI_V1_EVENT_NAME) {
        const value = (event as any).value as unknown;
        const valueResult = uiV1EventValueSchema.safeParse(value);
        if (!valueResult.success) {
          return { status: 'invalid', error: valueResult.error };
        }
      }
    }

    if (event.type === 'STATE_SNAPSHOT') {
      const snapshot = (event as any).snapshot as unknown;
      if (!isJsonObject(snapshot)) {
        setState({ ...state, needsResync: true, resyncReason: 'patch_error', gap: null, limitExceeded: null });
        return { status: 'needs_resync', reason: 'patch_error' };
      }
      const uiStateMaxComponents = limits?.uiState?.maxComponents;
      if (uiStateMaxComponents != null) {
        const ui = (snapshot as any).ui;
        const components = ui && typeof ui === 'object' && !Array.isArray(ui) ? (ui as any).components : null;
        if (components && typeof components === 'object' && !Array.isArray(components)) {
          const observed = Object.keys(components).length;
          if (observed > uiStateMaxComponents) {
            setState({
              ...state,
              needsResync: true,
              resyncReason: 'limit_exceeded',
              gap: null,
              limitExceeded: { limit: 'uiState.maxComponents', max: uiStateMaxComponents, observed },
            });
            return { status: 'needs_resync', reason: 'limit_exceeded' };
          }
        }
      }
      setState({
        ...state,
        lastSeq: seq,
        needsResync: false,
        resyncReason: null,
        gap: null,
        limitExceeded: null,
        sharedState: structuredClone(snapshot),
      });
      return { status: 'applied', seq };
    }

    if (event.type === 'STATE_DELTA') {
      const delta = (event as any).delta as unknown;
      if (!Array.isArray(delta)) {
        setState({ ...state, needsResync: true, resyncReason: 'patch_error', gap: null, limitExceeded: null });
        return { status: 'needs_resync', reason: 'patch_error' };
      }
      const maxOps = limits?.jsonPatch?.maxOps;
      if (maxOps != null && delta.length > maxOps) {
        setState({
          ...state,
          needsResync: true,
          resyncReason: 'limit_exceeded',
          gap: null,
          limitExceeded: { limit: 'jsonPatch.maxOps', max: maxOps, observed: delta.length },
        });
        return { status: 'needs_resync', reason: 'limit_exceeded' };
      }

      const allowedPathPrefixes = limits?.jsonPatch?.allowedPathPrefixes;
      if (allowedPathPrefixes && allowedPathPrefixes.length > 0) {
        for (const op of delta) {
          const path = (op as any)?.path;
          if (typeof path !== 'string') continue;
          const ok = allowedPathPrefixes.some((prefix) => path.startsWith(prefix));
          if (!ok) {
            setState({
              ...state,
              needsResync: true,
              resyncReason: 'limit_exceeded',
              gap: null,
              limitExceeded: { limit: 'jsonPatch.allowedPathPrefixes', max: 0, observed: 1, path },
            });
            return { status: 'needs_resync', reason: 'limit_exceeded' };
          }
        }
      }
      try {
        const result = applyPatch(state.sharedState, delta as any[], true, false);
        const nextSharedState = result.newDocument as unknown;
        if (!isJsonObject(nextSharedState)) {
          setState({ ...state, needsResync: true, resyncReason: 'patch_error', gap: null, limitExceeded: null });
          return { status: 'needs_resync', reason: 'patch_error' };
        }
        setState({
          ...state,
          lastSeq: seq,
          needsResync: false,
          resyncReason: null,
          gap: null,
          limitExceeded: null,
          sharedState: nextSharedState,
        });
        return { status: 'applied', seq };
      } catch {
        setState({ ...state, needsResync: true, resyncReason: 'patch_error', gap: null, limitExceeded: null });
        return { status: 'needs_resync', reason: 'patch_error' };
      }
    }

    if (event.type === 'MESSAGES_SNAPSHOT') {
      const messages = (event as any).messages as unknown;
      if (!Array.isArray(messages)) {
        return { status: 'invalid', error: new Error('MESSAGES_SNAPSHOT.messages must be an array') };
      }
      const nextMessages: Record<string, RivuKernelMessage> = {};
      const nextOrder: string[] = [];
      for (const raw of messages) {
        if (!raw || typeof raw !== 'object') continue;
        const msg: any = raw as any;
        if (typeof msg.id !== 'string' || !msg.id.trim()) continue;
        const role = typeof msg.role === 'string' ? (msg.role as RivuKernelMessageRole) : 'assistant';
        const content = typeof msg.content === 'string' ? msg.content : '';
        nextMessages[msg.id] = { id: msg.id, role, content, status: 'done' };
        nextOrder.push(msg.id);
      }
      setState({ ...state, lastSeq: seq, messages: nextMessages, messageOrder: nextOrder });
      return { status: 'applied', seq };
    }

    let nextState = state;

    if (event.type === 'TEXT_MESSAGE_START') {
      const messageId = String((event as any).messageId ?? '');
      const role = String((event as any).role ?? 'assistant') as RivuKernelMessageRole;
      nextState = withMessage(nextState, { id: messageId, role, content: '', status: 'streaming' });
      nextState = { ...nextState, lastSeq: seq };
      setState(nextState);
      return { status: 'applied', seq };
    }

    if (event.type === 'TEXT_MESSAGE_CONTENT') {
      const messageId = String((event as any).messageId ?? '');
      const delta = String((event as any).delta ?? '');
      const prev = nextState.messages[messageId] ?? {
        id: messageId,
        role: 'assistant',
        content: '',
        status: 'streaming',
      };
      nextState = withMessage(nextState, { ...prev, content: `${prev.content}${delta}` });
      nextState = { ...nextState, lastSeq: seq };
      setState(nextState);
      return { status: 'applied', seq };
    }

    if (event.type === 'TEXT_MESSAGE_END') {
      const messageId = String((event as any).messageId ?? '');
      const prev = nextState.messages[messageId];
      if (prev) nextState = withMessage(nextState, { ...prev, status: 'done' });
      nextState = { ...nextState, lastSeq: seq };
      setState(nextState);
      return { status: 'applied', seq };
    }

    if (event.type === 'TOOL_CALL_START') {
      const toolCallId = String((event as any).toolCallId ?? '');
      const toolCallName = String((event as any).toolCallName ?? '');
      const parentMessageId = (event as any).parentMessageId;
      nextState = withToolCall(nextState, {
        id: toolCallId,
        name: toolCallName,
        parentMessageId: typeof parentMessageId === 'string' ? parentMessageId : null,
        args: '',
        status: 'streaming',
        resultMessageId: null,
      });
      nextState = { ...nextState, lastSeq: seq };
      setState(nextState);
      return { status: 'applied', seq };
    }

    if (event.type === 'TOOL_CALL_ARGS') {
      const toolCallId = String((event as any).toolCallId ?? '');
      const delta = String((event as any).delta ?? '');
      const prev =
        nextState.toolCalls[toolCallId] ??
        ({
          id: toolCallId,
          name: '',
          parentMessageId: null,
          args: '',
          status: 'streaming',
          resultMessageId: null,
        } satisfies RivuKernelToolCall);
      nextState = withToolCall(nextState, { ...prev, args: `${prev.args}${delta}` });
      nextState = { ...nextState, lastSeq: seq };
      setState(nextState);
      return { status: 'applied', seq };
    }

    if (event.type === 'TOOL_CALL_END') {
      const toolCallId = String((event as any).toolCallId ?? '');
      const prev = nextState.toolCalls[toolCallId];
      if (prev) nextState = withToolCall(nextState, { ...prev, status: 'done' });
      nextState = { ...nextState, lastSeq: seq };
      setState(nextState);
      return { status: 'applied', seq };
    }

    if (event.type === 'TOOL_CALL_RESULT') {
      const messageId = String((event as any).messageId ?? '');
      const toolCallId = String((event as any).toolCallId ?? '');
      const content = String((event as any).content ?? '');
      nextState = withMessage(nextState, { id: messageId, role: 'tool', content, status: 'done' });
      const prev = nextState.toolCalls[toolCallId];
      if (prev) nextState = withToolCall(nextState, { ...prev, resultMessageId: messageId });
      nextState = { ...nextState, lastSeq: seq };
      setState(nextState);
      return { status: 'applied', seq };
    }

    if (event.type === 'TEXT_MESSAGE_CHUNK') {
      const messageId = (event as any).messageId;
      const role = (event as any).role;
      const delta = (event as any).delta;
      if (typeof messageId === 'string' && messageId.trim()) {
        const prev =
          nextState.messages[messageId] ??
          ({
            id: messageId,
            role: typeof role === 'string' ? (role as RivuKernelMessageRole) : 'assistant',
            content: '',
            status: 'streaming',
          } satisfies RivuKernelMessage);
        nextState = withMessage(nextState, {
          ...prev,
          content: `${prev.content}${typeof delta === 'string' ? delta : ''}`,
        });
      }
      nextState = { ...nextState, lastSeq: seq };
      setState(nextState);
      return { status: 'applied', seq };
    }

    if (event.type === 'TOOL_CALL_CHUNK') {
      const toolCallId = (event as any).toolCallId;
      const toolCallName = (event as any).toolCallName;
      const parentMessageId = (event as any).parentMessageId;
      const delta = (event as any).delta;
      if (typeof toolCallId === 'string' && toolCallId.trim()) {
        const prev =
          nextState.toolCalls[toolCallId] ??
          ({
            id: toolCallId,
            name: typeof toolCallName === 'string' ? toolCallName : '',
            parentMessageId: typeof parentMessageId === 'string' ? parentMessageId : null,
            args: '',
            status: 'streaming',
            resultMessageId: null,
          } satisfies RivuKernelToolCall);
        nextState = withToolCall(nextState, {
          ...prev,
          args: `${prev.args}${typeof delta === 'string' ? delta : ''}`,
        });
      }
      nextState = { ...nextState, lastSeq: seq };
      setState(nextState);
      return { status: 'applied', seq };
    }

    setState({ ...state, lastSeq: seq });
    return { status: 'applied', seq };
  }

  async function send(action: UiV1CustomEvent): Promise<SendResult> {
    const parsed = uiV1CustomEventSchema.safeParse(action);
    if (!parsed.success) {
      throw parsed.error;
    }

    const clientRequestId = parsed.data.value.clientRequestId;
    const existingPromise = sendPromisesByRequestId.get(clientRequestId);
    if (existingPromise) return existingPromise;

    const existingEntry = state.outbox[clientRequestId];
    if (existingEntry) {
      return { status: 'duplicate', clientRequestId };
    }

    if (!actionTransport) {
      throw new Error('actionTransport is not configured');
    }

    const createdAtMs = nowMs();
    const entry: OutboxEntry = {
      clientRequestId,
      status: 'pending',
      action: parsed.data,
      createdAtMs,
      ackedAtMs: null,
      failedAtMs: null,
      error: null,
    };

    setState({ ...state, outbox: { ...state.outbox, [clientRequestId]: entry } });

    const promise = actionTransport(parsed.data)
      .then(() => {
        const ackedAtMs = nowMs();
        const current = state.outbox[clientRequestId];
        if (current && current.status === 'pending') {
          setState({
            ...state,
            outbox: {
              ...state.outbox,
              [clientRequestId]: { ...current, status: 'acked', ackedAtMs },
            },
          });
        }
        return { status: 'sent', clientRequestId } as const;
      })
      .catch((error) => {
        const failedAtMs = nowMs();
        const current = state.outbox[clientRequestId];
        if (current && current.status === 'pending') {
          setState({
            ...state,
            outbox: {
              ...state.outbox,
              [clientRequestId]: { ...current, status: 'failed', failedAtMs, error },
            },
          });
        }
        throw error;
      })
      .finally(() => {
        sendPromisesByRequestId.delete(clientRequestId);
      });

    sendPromisesByRequestId.set(clientRequestId, promise);
    return promise;
  }

  return {
    dispatch,
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    send,
  };
}
