-- BR-038/DP-10: destino del archivo semestral de eventos de auditoría.
-- Misma estructura que acceso... es decir, auditoria.eventos_auditoria.
-- No se modela en Prisma a propósito: la aplicación (trazalia_app) no debe
-- poder leerla ni escribirla; solo el worker la toca, con el rol
-- trazalia_migrador. CREATE SCHEMA IF NOT EXISTS: en desarrollo/CI ya lo crea
-- docker/postgres/init/01-roles-y-esquemas.sql, pero la base de datos sombra
-- de Prisma (usada solo por `migrate dev`) parte en blanco y no lo conoce.
CREATE SCHEMA IF NOT EXISTS "auditoria_historico";

CREATE TABLE "auditoria_historico"."eventos_auditoria" (
    "id_evento" TEXT NOT NULL,
    "id_usuario_actor" TEXT,
    "id_usuario_afectado" TEXT,
    "tipo_evento" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "metadatos_minimos" JSONB,
    "fecha_evento" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_auditoria_historico_pkey" PRIMARY KEY ("id_evento")
);
