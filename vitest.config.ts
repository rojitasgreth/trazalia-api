import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: [
        'src/generado/**',
        'src/main.ts',
        'src/worker.ts',
        '**/*.module.ts',
        // Ensamblaje de la aplicación HTTP (Express/Nest, sin reglas de
        // negocio): se ejerce vía las pruebas e2e contra PostgreSQL real.
        'src/compartido/http/configurar-aplicacion.ts',
        // Scripts operativos (arrancan un contexto Nest completo); su lógica
        // propia se cubre por separado y se verifican manualmente/por e2e.
        'src/cli/**',
      ],
      // Documento Cero §15: cobertura mínima del 80% en los casos de uso de
      // cada módulo. Se activa desde el Corte 2, ya con los primeros casos de uso.
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
