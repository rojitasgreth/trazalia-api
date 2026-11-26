-- Prepara la base de calidad en Neon (equivale a docker/postgres/init/ para
-- desarrollo). Se ejecuta UNA vez en el SQL Editor de Neon, con la base
-- "trazalia" y el rol "trazalia_migrador" elegidos arriba del editor.
--
-- Antes, en la consola de Neon (ver docs/despliegue-calidad.md):
--   1. Roles → crear "trazalia_migrador" (Neon genera su contraseña).
--   2. Databases → crear "trazalia" con "trazalia_migrador" como propietario.
--
-- Cambia CAMBIA_ESTA_CONTRASENA por una contraseña larga y aleatoria antes de
-- ejecutar. No la guardes en el repositorio: va solo en DATABASE_URL de Render.
--
--   trazalia_migrador  propietario de los esquemas; ejecuta las migraciones.
--   trazalia_app       rol con el que se conecta la aplicación; sin DDL.

CREATE ROLE trazalia_app LOGIN PASSWORD 'CAMBIA_ESTA_CONTRASENA';

ALTER SCHEMA public OWNER TO trazalia_migrador;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO trazalia_app;

CREATE SCHEMA acceso AUTHORIZATION trazalia_migrador;
CREATE SCHEMA auditoria AUTHORIZATION trazalia_migrador;
CREATE SCHEMA auditoria_historico AUTHORIZATION trazalia_migrador;
CREATE SCHEMA historias AUTHORIZATION trazalia_migrador;
CREATE SCHEMA centros AUTHORIZATION trazalia_migrador;
CREATE SCHEMA valoraciones AUTHORIZATION trazalia_migrador;

GRANT USAGE ON SCHEMA acceso, auditoria, historias, centros, valoraciones TO trazalia_app;

ALTER DEFAULT PRIVILEGES FOR ROLE trazalia_migrador IN SCHEMA acceso
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO trazalia_app;
ALTER DEFAULT PRIVILEGES FOR ROLE trazalia_migrador IN SCHEMA acceso
  GRANT USAGE, SELECT ON SEQUENCES TO trazalia_app;

ALTER DEFAULT PRIVILEGES FOR ROLE trazalia_migrador IN SCHEMA auditoria
  GRANT SELECT, INSERT ON TABLES TO trazalia_app;
ALTER DEFAULT PRIVILEGES FOR ROLE trazalia_migrador IN SCHEMA auditoria
  GRANT USAGE, SELECT ON SEQUENCES TO trazalia_app;

ALTER DEFAULT PRIVILEGES FOR ROLE trazalia_migrador IN SCHEMA historias
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO trazalia_app;
-- Catálogo compartido de centros: solo lectura e inserción (ADR-0004).
ALTER DEFAULT PRIVILEGES FOR ROLE trazalia_migrador IN SCHEMA centros
  GRANT SELECT, INSERT ON TABLES TO trazalia_app;
-- Valoraciones: sin DELETE; una finalizada además es inmutable por trigger (ADR-0005).
ALTER DEFAULT PRIVILEGES FOR ROLE trazalia_migrador IN SCHEMA valoraciones
  GRANT SELECT, INSERT, UPDATE ON TABLES TO trazalia_app;
