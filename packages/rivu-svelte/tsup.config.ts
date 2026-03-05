import { defineConfig } from 'tsup';
import { compile } from 'svelte/compiler';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

function svelteCompilerPlugin() {
  return {
    name: 'svelte-compiler',
    setup(build: any) {
      build.onLoad({ filter: /\.svelte$/ }, async (args: any) => {
        const source = await readFile(args.path, 'utf8');
        const compiled = compile(source, { filename: args.path, generate: 'client' });
        return { contents: compiled.js.code, loader: 'js', resolveDir: path.dirname(args.path) };
      });
    },
  };
}

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  platform: 'browser',
  external: ['svelte', 'svelte/*'],
  esbuildPlugins: [svelteCompilerPlugin()],
});
