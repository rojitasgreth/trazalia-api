-- Esquemas por módulo y permisos por defecto. Se incluye desde 01-roles-y-esquemas.sql
-- para cada base de datos (los privilegios por defecto son por base de datos).

ALTER SCHEMA public OWNER TO trazalia_migrador;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO trazalia_app;

CREATE SCHEMA acceso AUTHORIZATION trazalia_migrador;
CREATE SCHEMA auditoria AUTHORIZATION trazalia_migrador;
CREATE SCHEMA auditoria_historico AUTHORIZATION trazalia_migrador;

GRANT USAGE ON SCHEMA acceso, auditoria TO trazalia_app;

ALTER DEFAULT PRIVILEGES FOR ROLE trazalia_migrador IN SCHEMA acceso
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO trazalia_app;
ALTER DEFAULT PRIVILEGES FOR ROLE trazalia_migrador IN SCHEMA acceso
  GRANT USAGE, SELECT ON SEQUENCES TO trazalia_app;

ALTER DEFAULT PRIVILEGES FOR ROLE trazalia_migrador IN SCHEMA auditoria
  GRANT SELECT, INSERT ON TABLES TO trazalia_app;
ALTER DEFAULT PRIVILEGES FOR ROLE trazalia_migrador IN SCHEMA auditoria
  GRANT USAGE, SELECT ON SEQUENCES TO trazalia_app;
