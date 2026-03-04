import { chartMarkV1Schema, type UiV1CapabilitiesFeaturesV1, type UiV1CapabilitiesValueV1 } from 'rivu-ui-spec';

import type { RivuComponentRegistry } from './registry.js';

type FeaturesOverride = Partial<UiV1CapabilitiesFeaturesV1> & Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeFeatures(base: UiV1CapabilitiesFeaturesV1, override?: FeaturesOverride): UiV1CapabilitiesFeaturesV1 {
  if (!override) return base;

  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (key === 'chart' && isPlainObject(merged.chart) && isPlainObject(value)) {
      merged.chart = { ...(merged.chart as Record<string, unknown>), ...value };
      continue;
    }
    if (key === 'export' && isPlainObject((merged as any).export) && isPlainObject(value)) {
      (merged as any).export = { ...(merged as any).export, ...value };
      continue;
    }

    merged[key] = value;
  }

  return merged as UiV1CapabilitiesFeaturesV1;
}

export function buildUiV1Capabilities(registry: RivuComponentRegistry, features?: FeaturesOverride): UiV1CapabilitiesValueV1 {
  const components: UiV1CapabilitiesValueV1['components'] = {};
  for (const [componentType, registration] of Object.entries(registry)) {
    components[componentType] = {
      minSchemaVersion: registration.schemaVersion,
      maxSchemaVersion: registration.schemaVersion,
    };
  }

  const baseFeatures: UiV1CapabilitiesFeaturesV1 = {
    datasets: true,
    lifecycle: true,
  };

  if (Object.prototype.hasOwnProperty.call(registry, 'Chart')) {
    baseFeatures.chart = {
      marks: chartMarkV1Schema.options,
      interactions: [],
    };
  }

  const merged = mergeFeatures(baseFeatures, features);

  return {
    v: 1,
    components,
    features: merged,
  };
}

