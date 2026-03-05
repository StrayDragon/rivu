import type { Component } from 'svelte';

import type { ChartPropsV1, ChartSelectionStateV1 } from 'rivu-ui-spec';

import type { RivuSvelteComponentProps } from '../registry.js';

declare const Chart: Component<
  RivuSvelteComponentProps<ChartPropsV1, ChartSelectionStateV1> & {
    interactive?: boolean | undefined;
  }
>;

export default Chart;

