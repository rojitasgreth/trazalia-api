-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "historias";

-- CreateEnum
CREATE TYPE "historias"."TipoHistoria" AS ENUM ('NEURO_ADULTO', 'TRAUMA_ADULTO', 'REHAB_INFANTIL', 'ADULTO_MAYOR');

-- CreateEnum
CREATE TYPE "historias"."EstadoHistoria" AS ENUM ('BORRADOR', 'ACTIVA');

-- CreateEnum
CREATE TYPE "historias"."NacionalidadPaciente" AS ENUM ('V', 'E');

-- CreateEnum
CREATE TYPE "historias"."SexoPaciente" AS ENUM ('FEMENINO', 'MASCULINO');

-- CreateEnum
CREATE TYPE "historias"."ParentescoRepresentante" AS ENUM ('MADRE', 'PADRE');

-- CreateTable
CREATE TABLE "historias"."pacientes" (
    "id_paciente" TEXT NOT NULL,
    "id_fisioterapeuta" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id_paciente")
);

-- CreateTable
CREATE TABLE "historias"."historias_clinicas" (
    "id_historia" TEXT NOT NULL,
    "id_paciente" TEXT NOT NULL,
    "id_fisioterapeuta" TEXT NOT NULL,
    "tipo" "historias"."TipoHistoria" NOT NULL,
    "estado" "historias"."EstadoHistoria" NOT NULL DEFAULT 'BORRADOR',
    "archivada" BOOLEAN NOT NULL DEFAULT false,
    "fecha_archivo" TIMESTAMP(3),
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "nacionalidad" "historias"."NacionalidadPaciente",
    "cedula" TEXT,
    "sin_documento" BOOLEAN NOT NULL DEFAULT false,
    "fecha_nacimiento" DATE,
    "sexo" "historias"."SexoPaciente",
    "dominancia" TEXT,
    "ocupacion" TEXT,
    "nivel_educativo" TEXT,
    "estado_civil" TEXT,
    "lugar_nacimiento" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "dir_estado" TEXT,
    "dir_municipio" TEXT,
    "dir_parroquia" TEXT,
    "dir_comunidad" TEXT,
    "contacto_nombre" TEXT,
    "contacto_parentesco" TEXT,
    "contacto_telefono" TEXT,
    "demandas_fisicas" TEXT,
    "fuente_informacion" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historias_clinicas_pkey" PRIMARY KEY ("id_historia")
);

-- CreateTable
CREATE TABLE "historias"."representantes_historia" (
    "id_historia" TEXT NOT NULL,
    "parentesco" "historias"."ParentescoRepresentante",
    "nombre" TEXT,
    "apellido" TEXT,
    "cedula" TEXT,
    "fecha_nacimiento" DATE,
    "estado_civil" TEXT,
    "grado_instruccion" TEXT,
    "ocupacion" TEXT,

    CONSTRAINT "representantes_historia_pkey" PRIMARY KEY ("id_historia")
);

-- CreateIndex
CREATE INDEX "pacientes_id_fisioterapeuta_idx" ON "historias"."pacientes"("id_fisioterapeuta");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_id_paciente_id_fisioterapeuta_key" ON "historias"."pacientes"("id_paciente", "id_fisioterapeuta");

-- CreateIndex
CREATE INDEX "historias_clinicas_id_fisioterapeuta_archivada_fecha_actual_idx" ON "historias"."historias_clinicas"("id_fisioterapeuta", "archivada", "fecha_actualizacion");

-- CreateIndex
CREATE INDEX "historias_clinicas_id_fisioterapeuta_cedula_idx" ON "historias"."historias_clinicas"("id_fisioterapeuta", "cedula");

-- CreateIndex
CREATE UNIQUE INDEX "historias_clinicas_id_paciente_tipo_key" ON "historias"."historias_clinicas"("id_paciente", "tipo");

-- AddForeignKey
ALTER TABLE "historias"."historias_clinicas" ADD CONSTRAINT "historias_clinicas_id_paciente_id_fisioterapeuta_fkey" FOREIGN KEY ("id_paciente", "id_fisioterapeuta") REFERENCES "historias"."pacientes"("id_paciente", "id_fisioterapeuta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historias"."representantes_historia" ADD CONSTRAINT "representantes_historia_id_historia_fkey" FOREIGN KEY ("id_historia") REFERENCES "historias"."historias_clinicas"("id_historia") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SQL manual (no expresable en schema.prisma) ───────────────────────────

-- Documento Cero §7: los registros clínicos referencian al fisioterapeuta
-- propietario. FK entre esquemas declarada solo en SQL para no acoplar el
-- código del módulo a las tablas de acceso. RESTRICT: un usuario con datos
-- clínicos no se borra (el Módulo A inactiva, nunca borra).
ALTER TABLE "historias"."pacientes" ADD CONSTRAINT "pacientes_id_fisioterapeuta_fkey"
  FOREIGN KEY ("id_fisioterapeuta") REFERENCES "acceso"."usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "historias"."historias_clinicas" ADD CONSTRAINT "historias_clinicas_id_fisioterapeuta_fkey"
  FOREIGN KEY ("id_fisioterapeuta") REFERENCES "acceso"."usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SPEC §7.2 / RF-008: mismo documento + mismo tipo + mismo fisioterapeuta.
-- Protege también ante solicitudes concurrentes (§18).
CREATE UNIQUE INDEX "historias_clinicas_documento_tipo_key"
  ON "historias"."historias_clinicas"("id_fisioterapeuta", "tipo", "nacionalidad", "cedula")
  WHERE "cedula" IS NOT NULL;

-- SPEC §7.2 / RF-009: infantil sin documento, mismo nombre + apellido +
-- fecha de nacimiento + tipo.
CREATE UNIQUE INDEX "historias_clinicas_sin_documento_tipo_key"
  ON "historias"."historias_clinicas"("id_fisioterapeuta", "tipo", lower("nombre"), lower("apellido"), "fecha_nacimiento")
  WHERE "sin_documento";

-- Coherencia del documento: sin documento implica cédula nula; los tipos de
-- adulto exigen nacionalidad y cédula (RF-025), también a nivel de base.
ALTER TABLE "historias"."historias_clinicas" ADD CONSTRAINT "historias_clinicas_documento_check" CHECK (
  ("sin_documento" = false OR "cedula" IS NULL)
  AND ("tipo" = 'REHAB_INFANTIL' OR ("nacionalidad" IS NOT NULL AND "cedula" IS NOT NULL AND "sin_documento" = false))
);

-- Permisos de la aplicación (rol sin DDL). En una base nueva ya los da
-- esquemas.sql.inc por defecto; aquí se conceden para bases existentes.
GRANT USAGE ON SCHEMA "historias" TO trazalia_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "historias" TO trazalia_app;
