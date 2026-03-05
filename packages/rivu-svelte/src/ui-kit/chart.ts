import { chartPropsV1Schema, chartSelectionStateV1Schema, type ChartPropsV1, type ChartSelectionStateV1 } from 'rivu-ui-spec';

import type { RivuSvelteComponentRegistration } from '../registry.js';

import Chart from './chart.svelte';

export const CHART_COMPONENT_TYPE = 'Chart' as const;
export const CHART_SCHEMA_VERSION = 1 as const;

export { Chart };

export const chartRegistrationV1: RivuSvelteComponentRegistration<ChartPropsV1, ChartSelectionStateV1> = {
  schemaVersion: CHART_SCHEMA_VERSION,
  propsSchema: chartPropsV1Schema,
  stateSchema: chartSelectionStateV1Schema,
  Component: Chart as any,
};

