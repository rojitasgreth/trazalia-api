import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    setupFiles: ['test/preparar-entorno.ts'],
    // Comparten una sola base de datos: se ejecutan en serie.
    fileParallelism: false,
  },
});
