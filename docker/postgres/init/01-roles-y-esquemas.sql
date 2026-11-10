-- Roles y esquemas de Trazalia (solo desarrollo y pruebas; en producción las contraseñas
-- se gestionan como secretos). Se ejecuta una vez, al crear el volumen de PostgreSQL.
--
--   trazalia_migrador  propietario de los esquemas; ejecuta las migraciones de Prisma.
--   trazalia_app       rol con el que se conecta la aplicación; sin DDL.
--
-- La auditoría es append-only para la aplicación (solo INSERT y SELECT) y el esquema
-- auditoria_historico no es accesible para trazalia_app (BR-038).

CREATE ROLE trazalia_migrador LOGIN PASSWORD 'migrador_dev' CREATEDB;
CREATE ROLE trazalia_app LOGIN PASSWORD 'app_dev';

ALTER DATABASE trazalia OWNER TO trazalia_migrador;
CREATE DATABASE trazalia_test OWNER trazalia_migrador;

\connect trazalia
\ir esquemas.sql.inc

\connect trazalia_test
\ir esquemas.sql.inc
