import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
  },
  {
    entry: ['src/coverage-worker.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: true,
  },
]);
