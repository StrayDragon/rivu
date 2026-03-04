import {
  uiStateV1Schema,
  type UiComponentV1,
  type UiDatasetV1,
  type UiMountV1,
  type UiStateV1,
} from 'rivu-ui-spec';

import type { RivuKernelState } from './kernel.js';

export type MountedUiComponentV1 = {
  componentId: string;
  component: UiComponentV1;
  mount: UiMountV1;
};

export function selectUiStateV1(state: RivuKernelState): UiStateV1 | null {
  const ui = (state.sharedState as any).ui as unknown;
  const parsed = uiStateV1Schema.safeParse(ui);
  return parsed.success ? parsed.data : null;
}

export function selectUiComponentV1(state: RivuKernelState, componentId: string): UiComponentV1 | null {
  const uiState = selectUiStateV1(state);
  if (!uiState) return null;
  return uiState.components[componentId] ?? null;
}

export function selectUiDatasetV1(state: RivuKernelState, datasetId: string): UiDatasetV1 | null {
  const uiState = selectUiStateV1(state);
  if (!uiState?.datasets) return null;
  return uiState.datasets[datasetId] ?? null;
}

export function selectMountedUiComponentsV1(params: {
  state: RivuKernelState;
  messageId: string;
  slot: string;
}): MountedUiComponentV1[] {
  const uiState = selectUiStateV1(params.state);
  if (!uiState) return [];

  const mounted: MountedUiComponentV1[] = [];

  for (const [componentId, component] of Object.entries(uiState.components)) {
    for (const mount of component.mounts) {
      if (mount.messageId !== params.messageId) continue;
      if (mount.slot !== params.slot) continue;
      mounted.push({ componentId, component, mount });
    }
  }

  mounted.sort((a, b) => a.mount.order - b.mount.order);
  return mounted;
}
