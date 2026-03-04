import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { z } from 'zod';

import type { RivuKernel } from 'rivu-kernel';
import { UI_V1_EVENT_NAME, type UiV1CustomEvent } from 'rivu-ui-spec';

import { createClientRequestId } from '../client-request-id.js';
import type { RivuComponentRegistration, RivuComponentRegistry, RivuHost } from '../registry.js';
import { defaultRenderHooks } from '../render-hooks.js';
import { applySlotProps } from '../slot-props.js';

const theme = {
  bg: 'var(--rivu-bg, #fff)',
  bgSubtle: 'var(--rivu-bg-subtle, #f3f4f6)',
  fg: 'var(--rivu-fg, #111827)',
  fgMuted: 'var(--rivu-fg-muted, #4b5563)',
  muted: 'var(--rivu-muted, #6b7280)',
  border: 'var(--rivu-border, #e5e7eb)',
  radius: 'var(--rivu-radius, 14px)',
  radiusSm: 'var(--rivu-radius-sm, 10px)',
  shadow: 'var(--rivu-shadow, none)',
  chart1: 'var(--rivu-chart-1, #2563eb)',
  chart2: 'var(--rivu-chart-2, #065f46)',
  chart4: 'var(--rivu-chart-4, #991b1b)',
} as const;

export const APPROVAL_CARD_COMPONENT_TYPE = 'ApprovalCard' as const;
export const APPROVAL_CARD_SCHEMA_VERSION = 1 as const;

export const approvalCardPropsV1Schema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    approveLabel: z.string().optional(),
    denyLabel: z.string().optional(),
  })
  .strict();
export type ApprovalCardPropsV1 = z.output<typeof approvalCardPropsV1Schema>;

export const approvalCardStateV1Schema = z
  .object({
    status: z.enum(['pending', 'approved', 'denied']).default('pending'),
    disabled: z.boolean().optional(),
    decidedAtMs: z.number().int().optional(),
    decidedBy: z.string().optional(),
    message: z.string().optional(),
  })
  .passthrough();
export type ApprovalCardStateV1 = z.output<typeof approvalCardStateV1Schema>;

function buttonStyle(kind: 'primary' | 'danger' | 'default'): CSSProperties {
  const base: CSSProperties = {
    padding: 'var(--rivu-space-2, 8px) var(--rivu-space-3, 12px)',
    borderRadius: theme.radiusSm,
    border: '1px solid transparent',
    fontSize: 'var(--rivu-font-size-sm, 12px)',
    fontWeight: 600,
    cursor: 'pointer',
  };
  if (kind === 'primary') return { ...base, background: theme.chart1, color: '#fff' };
  if (kind === 'danger') {
    return {
      ...base,
      background: 'var(--rivu-danger-bg, #fee2e2)',
      borderColor: 'var(--rivu-danger-border, #fecaca)',
      color: theme.chart4,
    };
  }
  return { ...base, background: theme.bgSubtle, color: theme.fg };
}

export type ApprovalCardSlots = {
  Status?: (args: {
    status: ApprovalCardStateV1['status'];
    decidedBy?: string;
    decidedAtMs?: number;
  }) => ReactNode;
  Actions?: (args: {
    disabled: boolean;
    sending: 'approve' | 'deny' | null;
    approveLabel: string;
    denyLabel: string;
    onApprove: () => void;
    onDeny: () => void;
  }) => ReactNode;
};

export function ApprovalCard(
  props: ApprovalCardPropsV1 & {
    host?: RivuHost;
    kernel: RivuKernel;
    componentId: string;
    revision: number;
    state: ApprovalCardStateV1 | undefined;
    className?: string;
    style?: CSSProperties;
    slots?: ApprovalCardSlots;
  },
) {
  const hooks = props.host?.renderHooks ?? defaultRenderHooks;
  const slotProps = props.host?.slotProps?.ApprovalCard;
  const meta = { componentId: props.componentId, componentType: APPROVAL_CARD_COMPONENT_TYPE };

  const status = props.state?.status ?? 'pending';
  const disabled = props.state?.disabled === true;
  const [localError, setLocalError] = useState<string | null>(null);
  const [sending, setSending] = useState<'approve' | 'deny' | null>(null);

  const sendEvent = async (eventName: 'approve' | 'deny') => {
    if (disabled) return;
    if (status !== 'pending') return;
    if (sending) return;

    setLocalError(null);
    setSending(eventName);

    const action: UiV1CustomEvent = {
      type: 'CUSTOM',
      name: UI_V1_EVENT_NAME,
      value: {
        componentId: props.componentId,
        eventName,
        payload: {},
        clientRequestId: createClientRequestId(),
        baseRevision: props.revision,
      },
    };

    try {
      await props.kernel.send(action);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(null);
    }
  };

  const statusNode = props.slots?.Status ? (
    props.slots.Status({
      status,
      ...(typeof props.state?.decidedBy === 'string' ? { decidedBy: props.state.decidedBy } : {}),
      ...(typeof props.state?.decidedAtMs === 'number' ? { decidedAtMs: props.state.decidedAtMs } : {}),
    })
  ) : (
    <div
      {...(() => {
        const statusSlot = applySlotProps({ style: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 } }, slotProps?.status);
        const { className, style, ...attrs } = statusSlot;
        return { className, style, ...attrs };
      })()}
    >
      <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: 'var(--rivu-fg-muted, #374151)' }}>
        status:{' '}
        <span style={{ fontWeight: 650, color: status === 'approved' ? theme.chart2 : status === 'denied' ? theme.chart4 : 'var(--rivu-fg-muted, #374151)' }}>
          {status}
        </span>
      </div>
      {props.state?.decidedBy ? <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.muted }}>by {props.state.decidedBy}</div> : null}
      {typeof props.state?.decidedAtMs === 'number' ? (
        <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.muted }}>{hooks.formatDateTime(props.state.decidedAtMs, { ...meta, path: 'state.decidedAtMs' })}</div>
      ) : null}
    </div>
  );

  const actionsNode =
    status === 'pending'
      ? props.slots?.Actions
        ? props.slots.Actions({
            disabled: disabled || !!sending,
            sending,
            approveLabel: props.approveLabel ?? 'Approve',
            denyLabel: props.denyLabel ?? 'Deny',
            onApprove: () => void sendEvent('approve'),
            onDeny: () => void sendEvent('deny'),
          })
        : (
            <div
              {...(() => {
                const actionsSlot = applySlotProps({ style: { marginTop: 12, display: 'flex', gap: 10 } }, slotProps?.actions);
                const { className, style, ...attrs } = actionsSlot;
                return { className, style, ...attrs };
              })()}
            >
              <button
                type="button"
                {...(() => {
                  const approveSlot = applySlotProps(
                    { style: { ...buttonStyle('primary'), opacity: disabled || sending ? 0.7 : 1 } },
                    slotProps?.approveButton,
                  );
                  const { className, style, ...attrs } = approveSlot;
                  return { className, style, ...attrs };
                })()}
                disabled={disabled || !!sending}
                onClick={() => void sendEvent('approve')}
              >
                {sending === 'approve' ? 'Approving…' : props.approveLabel ?? 'Approve'}
              </button>
              <button
                type="button"
                {...(() => {
                  const denySlot = applySlotProps(
                    { style: { ...buttonStyle('danger'), opacity: disabled || sending ? 0.7 : 1 } },
                    slotProps?.denyButton,
                  );
                  const { className, style, ...attrs } = denySlot;
                  return { className, style, ...attrs };
                })()}
                disabled={disabled || !!sending}
                onClick={() => void sendEvent('deny')}
              >
                {sending === 'deny' ? 'Denying…' : props.denyLabel ?? 'Deny'}
              </button>
            </div>
          )
      : null;

  const rootSlot = applySlotProps(
    {
      className: props.className,
      style: {
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        padding: 'var(--rivu-space-4, 14px)',
        background: theme.bg,
        boxShadow: theme.shadow,
        ...props.style,
      },
    },
    slotProps?.root,
  );
  const { className: rootClassName, style: rootStyle, ...rootAttrs } = rootSlot;

  return (
    <div
      className={rootClassName}
      style={rootStyle}
      {...(rootAttrs as any)}
    >
      <div style={{ fontWeight: 650, fontSize: 'var(--rivu-font-size-base, 14px)', color: theme.fg }}>{props.title}</div>
      {props.description ? (
        <div style={{ marginTop: 6, fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.fgMuted }}>
          {hooks.renderMarkdown(props.description, { ...meta, path: 'description' })}
        </div>
      ) : null}

      {statusNode}

      {props.state?.message ? (
        <div style={{ marginTop: 8, fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.fgMuted }}>
          {hooks.renderMarkdown(props.state.message, { ...meta, path: 'state.message' })}
        </div>
      ) : null}
      {localError ? <div style={{ marginTop: 8, fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.chart4 }}>{localError}</div> : null}

      {actionsNode}
    </div>
  );
}

export const approvalCardRegistrationV1: RivuComponentRegistration<ApprovalCardPropsV1, ApprovalCardStateV1> = {
  schemaVersion: APPROVAL_CARD_SCHEMA_VERSION,
  propsSchema: approvalCardPropsV1Schema,
  stateSchema: approvalCardStateV1Schema,
  render: ({ kernel, host, componentId, revision, props, state }) => (
    <ApprovalCard host={host} kernel={kernel} componentId={componentId} revision={revision} state={state} {...props} />
  ),
};

export const FORM_CARD_COMPONENT_TYPE = 'FormCard' as const;
export const FORM_CARD_SCHEMA_VERSION = 1 as const;

const formFieldTypeSchema = z.enum(['text', 'textarea', 'number', 'select']);
const formFieldOptionSchema = z.object({ label: z.string().min(1), value: z.string().min(1) }).strict();
export const formCardPropsV1Schema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    submitLabel: z.string().optional(),
    fields: z
      .array(
        z
          .object({
            id: z.string().min(1),
            label: z.string().min(1),
            type: formFieldTypeSchema,
            required: z.boolean().optional(),
            placeholder: z.string().optional(),
            options: z.array(formFieldOptionSchema).optional(),
          })
          .strict()
          .superRefine((field, ctx) => {
            if (field.type === 'select' && (!field.options || field.options.length === 0)) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'select field must have options' });
            }
          }),
      )
      .min(1),
  })
  .strict();
export type FormCardPropsV1 = z.output<typeof formCardPropsV1Schema>;

const formValueSchema = z.union([z.string(), z.number().finite(), z.null()]);
export const formCardStateV1Schema = z
  .object({
    values: z.record(z.string(), formValueSchema).default({}),
    errors: z.record(z.string(), z.string()).optional(),
    disabled: z.boolean().optional(),
    status: z.enum(['idle', 'submitting', 'submitted', 'error']).optional(),
  })
  .passthrough();
export type FormCardStateV1 = z.output<typeof formCardStateV1Schema>;

export type FormCardSlots = {
  Status?: (args: { status?: FormCardStateV1['status']; localError: string | null }) => ReactNode;
  Actions?: (args: { disabled: boolean; status?: FormCardStateV1['status']; label: string; onSubmit: () => void }) => ReactNode;
};

function normalizeValue(raw: string, type: z.output<typeof formFieldTypeSchema>): string | number | null {
  if (type === 'number') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return raw;
}

function domId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function FormCard(
  props: FormCardPropsV1 & {
    host?: RivuHost;
    kernel: RivuKernel;
    componentId: string;
    revision: number;
    state: FormCardStateV1 | undefined;
    className?: string;
    style?: CSSProperties;
    slots?: FormCardSlots;
  },
) {
  const hooks = props.host?.renderHooks ?? defaultRenderHooks;
  const slotProps = props.host?.slotProps?.FormCard;
  const meta = { componentId: props.componentId, componentType: FORM_CARD_COMPONENT_TYPE };

  const disabled = props.state?.disabled === true || props.state?.status === 'submitting';
  const serverValues = props.state?.values ?? {};

  const [localError, setLocalError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | number | null>>(() => ({ ...serverValues }));

  useEffect(() => {
    setValues({ ...serverValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.revision]);

  const errors = props.state?.errors ?? {};

  const sendUiEvent = async (eventName: 'setField' | 'submit', payload: Record<string, unknown>) => {
    const action: UiV1CustomEvent = {
      type: 'CUSTOM',
      name: UI_V1_EVENT_NAME,
      value: {
        componentId: props.componentId,
        eventName,
        payload,
        clientRequestId: createClientRequestId(),
        baseRevision: props.revision,
      },
    };
    await props.kernel.send(action);
  };

  const fieldById = useMemo(() => new Map(props.fields.map((f) => [f.id, f])), [props.fields]);

  const onChange = async (fieldId: string, raw: string) => {
    const field = fieldById.get(fieldId);
    if (!field) return;
    const value = normalizeValue(raw, field.type);
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setLocalError(null);
    try {
      await sendUiEvent('setField', { fieldId, value });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  };

  const onSubmit = async () => {
    if (disabled) return;
    setLocalError(null);
    try {
      await sendUiEvent('submit', { values });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  };

  const status = typeof props.state?.status === 'string' ? props.state.status : undefined;
  const statusNode = props.slots?.Status
    ? props.slots.Status({ localError, ...(status ? { status } : {}) })
    : status || localError
      ? (
          <div
            {...(() => {
              const statusSlot = applySlotProps({ style: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 } }, slotProps?.status);
              const { className, style, ...attrs } = statusSlot;
              return { className, style, ...attrs };
            })()}
          >
            {status ? (
              <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: 'var(--rivu-fg-muted, #374151)' }}>
                status:{' '}
                <span style={{ fontWeight: 650, color: status === 'submitted' ? theme.chart2 : status === 'error' ? theme.chart4 : 'var(--rivu-fg-muted, #374151)' }}>
                  {status}
                </span>
              </div>
            ) : null}
            {localError ? <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.chart4 }}>{localError}</div> : null}
          </div>
        )
      : null;
  const submitLabel = props.submitLabel ?? (props.state?.status === 'submitting' ? 'Submitting…' : 'Submit');

  const rootSlot = applySlotProps(
    {
      className: props.className,
      style: {
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        padding: 'var(--rivu-space-4, 14px)',
        background: theme.bg,
        boxShadow: theme.shadow,
        ...props.style,
      },
    },
    slotProps?.root,
  );
  const { className: rootClassName, style: rootStyle, ...rootAttrs } = rootSlot;

  return (
    <div
      className={rootClassName}
      style={rootStyle}
      {...(rootAttrs as any)}
    >
      <div style={{ fontWeight: 650, fontSize: 'var(--rivu-font-size-base, 14px)', color: theme.fg }}>{props.title}</div>
      {props.description ? (
        <div style={{ marginTop: 6, fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.fgMuted }}>
          {hooks.renderMarkdown(props.description, { ...meta, path: 'description' })}
        </div>
      ) : null}

      <div
        {...(() => {
          const fieldsSlot = applySlotProps(
            { style: { marginTop: 'var(--rivu-space-3, 12px)', display: 'flex', flexDirection: 'column', gap: 12 } },
            slotProps?.fields,
          );
          const { className, style, ...attrs } = fieldsSlot;
          return { className, style, ...attrs };
        })()}
      >
        {props.fields.map((field) => {
          const value = values[field.id];
          const error = errors[field.id];
          const labelText = `${field.label}${field.required ? ' *' : ''}`;
          const inputId = `rivu_form_${domId(props.componentId)}_${domId(field.id)}`;
          const commonStyle: CSSProperties = {
            width: '100%',
            borderRadius: theme.radiusSm,
            border: `1px solid ${theme.border}`,
            padding: 'var(--rivu-space-2, 8px) 10px',
            fontSize: 'var(--rivu-font-size-sm, 12px)',
            outline: 'none',
            background: theme.bg,
            color: theme.fg,
          };

          return (
            <div
              key={field.id}
              {...(() => {
                const fieldSlot = applySlotProps({}, slotProps?.field);
                const { className, style, ...attrs } = fieldSlot;
                return { className, style, ...attrs };
              })()}
            >
              <label
                htmlFor={inputId}
                style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', fontWeight: 600, color: theme.fg, display: 'block' }}
              >
                {labelText}
              </label>
              <div style={{ marginTop: 6 }}>
                {field.type === 'textarea' ? (
                  <textarea
                    id={inputId}
                    value={typeof value === 'string' ? value : value == null ? '' : String(value)}
                    placeholder={field.placeholder}
                    disabled={disabled}
                    onChange={(e) => void onChange(field.id, e.target.value)}
                    rows={3}
                    style={commonStyle}
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={inputId}
                    value={typeof value === 'string' ? value : value == null ? '' : String(value)}
                    disabled={disabled}
                    onChange={(e) => void onChange(field.id, e.target.value)}
                    style={commonStyle}
                  >
                    <option value="" disabled={field.required}>
                      {field.placeholder ?? 'Select…'}
                    </option>
                    {(field.options ?? []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={inputId}
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={typeof value === 'string' ? value : value == null ? '' : String(value)}
                    placeholder={field.placeholder}
                    disabled={disabled}
                    onChange={(e) => void onChange(field.id, e.target.value)}
                    style={commonStyle}
                  />
                )}
              </div>
              {error ? <div style={{ marginTop: 6, fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.chart4 }}>{error}</div> : null}
            </div>
          );
        })}
      </div>

      {statusNode}

      <div
        {...(() => {
          const actionsSlot = applySlotProps({ style: { marginTop: 'var(--rivu-space-4, 14px)', display: 'flex', gap: 10 } }, slotProps?.actions);
          const { className, style, ...attrs } = actionsSlot;
          return { className, style, ...attrs };
        })()}
      >
        {props.slots?.Actions ? (
          props.slots.Actions({
            disabled,
            label: submitLabel,
            onSubmit: () => void onSubmit(),
            ...(typeof props.state?.status === 'string' ? { status: props.state.status } : {}),
          })
        ) : (
          <button
            type="button"
            {...(() => {
              const submitSlot = applySlotProps({ style: { ...buttonStyle('primary'), opacity: disabled ? 0.7 : 1 } }, slotProps?.submitButton);
              const { className, style, ...attrs } = submitSlot;
              return { className, style, ...attrs };
            })()}
            disabled={disabled}
            onClick={() => void onSubmit()}
          >
            {submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export const formCardRegistrationV1: RivuComponentRegistration<FormCardPropsV1, FormCardStateV1> = {
  schemaVersion: FORM_CARD_SCHEMA_VERSION,
  propsSchema: formCardPropsV1Schema,
  stateSchema: formCardStateV1Schema,
  render: ({ kernel, host, componentId, revision, props, state }) => (
    <FormCard host={host} kernel={kernel} componentId={componentId} revision={revision} state={state} {...props} />
  ),
};

export const workflowRegistryV1 = {
  [APPROVAL_CARD_COMPONENT_TYPE]: approvalCardRegistrationV1,
  [FORM_CARD_COMPONENT_TYPE]: formCardRegistrationV1,
} satisfies RivuComponentRegistry;
