import { expect, test } from 'vitest';

import { uiInputLimitsV1Schema, viewerDefaults, workflowDefaults } from '../src/index.js';

test('viewerDefaults/workflowDefaults are valid and match spec values', () => {
  expect(uiInputLimitsV1Schema.safeParse(viewerDefaults).success).toBe(true);
  expect(uiInputLimitsV1Schema.safeParse(workflowDefaults).success).toBe(true);

  expect(viewerDefaults).toEqual({
    decode: { maxBytes: 1048576, maxDepth: 32, maxStringLength: 100000 },
    uiEvent: { maxPayloadKeys: 32 },
    uiState: {
      maxComponents: 500,
      maxMountsTotal: 5000,
      maxDatasets: 50,
      maxDatasetRows: 10000,
      maxDatasetColumns: 50,
    },
    jsonPatch: { maxOps: 2000, maxPathLength: 256, allowedPathPrefixes: ['/ui'] },
  });

  expect(workflowDefaults).toEqual({
    decode: { maxBytes: 262144, maxDepth: 24, maxStringLength: 50000 },
    uiEvent: { maxPayloadKeys: 16 },
    uiState: {
      maxComponents: 200,
      maxMountsTotal: 2000,
      maxDatasets: 20,
      maxDatasetRows: 2000,
      maxDatasetColumns: 50,
    },
    jsonPatch: { maxOps: 500, maxPathLength: 256, allowedPathPrefixes: ['/ui'] },
  });
});

