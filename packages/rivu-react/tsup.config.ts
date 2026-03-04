import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  platform: 'browser',
  external: ['react', 'react-dom', 'rivu-kernel', 'rivu-ui-spec', 'zod'],
});
