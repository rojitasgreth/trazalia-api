-- Nota: Prisma propone borrar las FK hacia acceso.usuarios y centros, y el índice
-- historias_clinicas_id_centro_idx, creados con SQL manual en migraciones
-- anteriores (no están en schema.prisma a propósito). Se eliminaron esas
-- sentencias DROP; revisarlo en cada migración nueva.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "valoraciones";

-- CreateEnum
CREATE TYPE "valoraciones"."EstadoValoracion" AS ENUM ('EN_CURSO', 'FINALIZADA');

-- CreateTable
CREATE TABLE "valoraciones"."valoraciones" (
    "id_valoracion" TEXT NOT NULL,
    "id_historia" TEXT NOT NULL,
    "id_fisioterapeuta" TEXT NOT NULL,
    "nombre_fisioterapeuta" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" "valoraciones"."EstadoValoracion" NOT NULL DEFAULT 'EN_CURSO',
    "version_ficha" INTEGER NOT NULL,
    "contenido" JSONB NOT NULL DEFAULT '{}',
    "datos_personales" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_finalizacion" TIMESTAMP(3),
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "valoraciones_pkey" PRIMARY KEY ("id_valoracion")
);

-- CreateIndex
CREATE UNIQUE INDEX "valoraciones_id_historia_key" ON "valoraciones"."valoraciones"("id_historia");

-- CreateIndex
CREATE INDEX "valoraciones_id_fisioterapeuta_idx" ON "valoraciones"."valoraciones"("id_fisioterapeuta");

-- ─── SQL manual (no expresable en schema.prisma) ───────────────────────────

-- Documento Cero §5: el módulo valoraciones referencia la historia y al
-- fisioterapeuta solo por FK. Una historia con valoración no se borra (se
-- archiva, decisión del 19-11-2026), por eso RESTRICT.
ALTER TABLE "valoraciones"."valoraciones" ADD CONSTRAINT "valoraciones_id_historia_fkey"
  FOREIGN KEY ("id_historia") REFERENCES "historias"."historias_clinicas"("id_historia") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "valoraciones"."valoraciones" ADD CONSTRAINT "valoraciones_id_fisioterapeuta_fkey"
  FOREIGN KEY ("id_fisioterapeuta") REFERENCES "acceso"."usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RF-C13/RF-C14: una valoración finalizada no se modifica ni se elimina por
-- ninguna vía, aunque la aplicación lo intentara.
CREATE FUNCTION "valoraciones"."impedir_cambios_en_finalizada"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado = 'FINALIZADA' THEN
    RAISE EXCEPTION 'La valoración % está finalizada y no se puede modificar.', OLD.id_valoracion
      USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "valoraciones_inmutables_finalizadas"
  BEFORE UPDATE OR DELETE ON "valoraciones"."valoraciones"
  FOR EACH ROW EXECUTE FUNCTION "valoraciones"."impedir_cambios_en_finalizada"();

-- La aplicación inicia, guarda y finaliza; nunca elimina valoraciones.
GRANT USAGE ON SCHEMA "valoraciones" TO trazalia_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA "valoraciones" TO trazalia_app;
