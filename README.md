# trazalia-api

API de Trazalia, la aplicación SaaS de gestión fisioterapéutica. Es un monolito modular con NestJS 12, PostgreSQL 18 y Prisma 7.10, que corre sobre Node.js 26 LTS.

Las fuentes de verdad son el **Documento Cero** (la constitución técnica) y el **spec de cada módulo**, que viven fuera de este repositorio, en `fisio/docs/docs/`. Antes de cambiar algo, lee el Documento Cero y el spec vigente del módulo.

## Requisitos

- Node.js 26 LTS
- Docker Desktop, para PostgreSQL y Mailpit

## Puesta en marcha

```bash
npm ci
cp .env.example .env
cp .env.example .env.test     # y cambia /trazalia por /trazalia_test en las dos URL
npm run infra:levantar        # PostgreSQL 18 + Mailpit (http://localhost:8025)
npm run prisma:generar
npm run prisma:desplegar
npm run start:dev             # http://localhost:3000/api/v1/salud
```

Fuera de producción, la documentación OpenAPI está en `http://localhost:3000/api/v1/docs`.

## Scripts

| Script | Qué hace |
|---|---|
| `start:dev` | API en modo desarrollo, con recarga automática |
| `worker` | Proceso de tareas en segundo plano (requiere `build`) |
| `test` / `test:cov` | Pruebas unitarias con Vitest |
| `test:e2e` | Pruebas e2e con Supertest contra PostgreSQL real (`trazalia_test`) |
| `lint`, `typecheck`, `format:check` | Calidad; las mismas verificaciones que ejecuta el CI |
| `prisma:migrar` | Crea y aplica una migración en desarrollo |
| `prisma:desplegar` | Aplica las migraciones pendientes (CI y producción) |

## Base de datos

- Hay un esquema PostgreSQL por módulo: `acceso`, `auditoria` y `auditoria_historico`.
- Se usan dos roles (ver `docker/postgres/init/`):
  - **`trazalia_migrador`**: es el propietario de los esquemas y ejecuta las migraciones (`DATABASE_URL_MIGRACIONES`).
  - **`trazalia_app`**: es el rol con el que se conecta la aplicación (`DATABASE_URL`). No puede ejecutar DDL. En `auditoria` solo puede insertar y leer, y no tiene acceso a `auditoria_historico`.
- `auditoria_historico` solo se consulta directamente en la base de datos, con el usuario `postgres`.

## Estructura

```
src/
  configuracion/   validación de variables de entorno (Zod)
  compartido/      infraestructura transversal (Prisma, HTTP)
  modulos/         un directorio por módulo funcional
  generado/        cliente Prisma generado (no versionado)
  main.ts          servidor HTTP
  worker.ts        proceso de tareas en segundo plano
test/              pruebas e2e
```
