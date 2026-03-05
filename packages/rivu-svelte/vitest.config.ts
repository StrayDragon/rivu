import { defineConfig } from 'vitest/config';
import { compile } from 'svelte/compiler';

function svelteCompilerPlugin() {
  return {
    name: 'svelte-compiler',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (!id.endsWith('.svelte')) return null;
      const compiled = compile(code, { filename: id, generate: 'client' });
      return { code: compiled.js.code, map: compiled.js.map ?? null };
    },
  };
}

export default defineConfig({
  plugins: [svelteCompilerPlugin()],
  test: {
    environment: 'node',
  },
});

