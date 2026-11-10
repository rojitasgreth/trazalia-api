import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Las migraciones se ejecutan con el rol propietario de los esquemas; la aplicación
// usa DATABASE_URL (rol sin DDL) en tiempo de ejecución.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL_MIGRACIONES') },
});
