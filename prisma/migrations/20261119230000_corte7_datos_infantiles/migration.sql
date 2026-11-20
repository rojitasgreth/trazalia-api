-- Nota: Prisma propone borrar las FK hacia acceso.usuarios y centros, y el índice
-- historias_clinicas_id_centro_idx, creados con SQL manual en migraciones
-- anteriores (no están en schema.prisma a propósito). Se eliminaron esas
-- sentencias DROP; revisarlo en cada migración nueva.

-- SPEC B v1.6 §8.4: la ficha pide la edad del representante (número), no su
-- fecha de nacimiento.
-- AlterTable
ALTER TABLE "historias"."representantes_historia" DROP COLUMN "fecha_nacimiento",
ADD COLUMN     "edad" INTEGER;

-- CreateTable
CREATE TABLE "historias"."datos_infantiles" (
    "id_historia" TEXT NOT NULL,
    "control_prenatal" TEXT,
    "control_prenatal_desde" TEXT,
    "gestas" INTEGER,
    "formula_p" INTEGER,
    "formula_f" INTEGER,
    "formula_c" INTEGER,
    "formula_a" INTEGER,
    "infecciones_urinarias" TEXT,
    "hemorragias" TEXT,
    "infecciones_vaginales" TEXT,
    "embarazo_otras" TEXT,
    "enfermedad_base" TEXT,
    "medicamentos" TEXT,
    "consumo_alcohol" TEXT,
    "consumo_tabaco" TEXT,
    "consumo_otros" TEXT,
    "tipo_sangre" TEXT,
    "complicaciones_maternas" TEXT,
    "edad_gestacional" INTEGER,
    "edad_cronologica" TEXT,
    "edad_corregida" TEXT,
    "peso" TEXT,
    "talla" TEXT,
    "respiro" TEXT,
    "lloro" TEXT,
    "apgar" TEXT,
    "requirio_o2" TEXT,
    "fototerapia" TEXT,
    "transfusiones" TEXT,
    "sdr" TEXT,
    "sepsis_neonatal" TEXT,
    "ictericia" TEXT,
    "anemia" TEXT,
    "neonatal_otros" TEXT,
    "vacunas" TEXT,
    "alimentacion" TEXT,
    "pesquisa_neonatal" TEXT,
    "emisiones_otoacusticas" TEXT,
    "eco_cerebral" TEXT,
    "eco_abdominal" TEXT,
    "evaluado_cardiologia" TEXT,
    "evaluado_neurologia" TEXT,
    "evaluado_oftalmologia" TEXT,

    CONSTRAINT "datos_infantiles_pkey" PRIMARY KEY ("id_historia")
);

-- AddForeignKey
ALTER TABLE "historias"."datos_infantiles" ADD CONSTRAINT "datos_infantiles_id_historia_fkey" FOREIGN KEY ("id_historia") REFERENCES "historias"."historias_clinicas"("id_historia") ON DELETE CASCADE ON UPDATE CASCADE;

-- La tabla nueva queda cubierta por los privilegios por defecto del esquema
-- historias; se concede explícitamente por si la base se creó antes de ellos.
GRANT SELECT, INSERT, UPDATE, DELETE ON "historias"."datos_infantiles" TO trazalia_app;
