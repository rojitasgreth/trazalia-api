-- Nota: Prisma propone borrar las FK hacia acceso.usuarios creadas con SQL manual en
-- 20261117010109_modulo_b_historias_clinicas (no están en schema.prisma a propósito).
-- Se eliminaron esas sentencias DROP; revisarlo en cada migración nueva.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "centros";

-- CreateEnum
CREATE TYPE "historias"."ModalidadAtencion" AS ENUM ('DOMICILIO', 'CENTRO');

-- AlterTable
ALTER TABLE "historias"."historias_clinicas" ADD COLUMN     "id_centro" TEXT,
ADD COLUMN     "modalidad" "historias"."ModalidadAtencion";

-- CreateTable
CREATE TABLE "centros"."centros_medicos" (
    "id_centro" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "dir_estado" TEXT NOT NULL,
    "dir_municipio" TEXT NOT NULL,
    "municipio_normalizado" TEXT NOT NULL,
    "dir_parroquia" TEXT NOT NULL,
    "dir_comunidad" TEXT,
    "id_fisioterapeuta_creador" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "centros_medicos_pkey" PRIMARY KEY ("id_centro")
);

-- CreateIndex
CREATE INDEX "centros_medicos_nombre_normalizado_idx" ON "centros"."centros_medicos"("nombre_normalizado");

-- CreateIndex
CREATE UNIQUE INDEX "centros_medicos_nombre_normalizado_dir_estado_municipio_nor_key" ON "centros"."centros_medicos"("nombre_normalizado", "dir_estado", "municipio_normalizado");

-- ─── SQL manual (no expresable en schema.prisma) ───────────────────────────

-- ADR-0004: quien registró el centro (solo trazabilidad; nunca se expone).
ALTER TABLE "centros"."centros_medicos" ADD CONSTRAINT "centros_medicos_id_fisioterapeuta_creador_fkey"
  FOREIGN KEY ("id_fisioterapeuta_creador") REFERENCES "acceso"."usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SPEC B v1.4 §8.6: la historia atendida en centro referencia el catálogo.
ALTER TABLE "historias"."historias_clinicas" ADD CONSTRAINT "historias_clinicas_id_centro_fkey"
  FOREIGN KEY ("id_centro") REFERENCES "centros"."centros_medicos"("id_centro") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Solo hay centro cuando la modalidad es CENTRO.
ALTER TABLE "historias"."historias_clinicas" ADD CONSTRAINT "historias_clinicas_centro_modalidad_check"
  CHECK ("id_centro" IS NULL OR "modalidad" = 'CENTRO');

CREATE INDEX "historias_clinicas_id_centro_idx" ON "historias"."historias_clinicas"("id_centro");

-- Catálogo compartido: la aplicación solo consulta y registra centros; no los
-- edita ni los borra en esta fase (decisión del 17-11-2026).
GRANT USAGE ON SCHEMA "centros" TO trazalia_app;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA "centros" TO trazalia_app;