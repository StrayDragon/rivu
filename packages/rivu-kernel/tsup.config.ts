import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  platform: 'browser',
  external: ['@ag-ui/core', 'fast-json-patch', 'rivu-ui-spec'],
});
