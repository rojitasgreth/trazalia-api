-- CreateTable
CREATE TABLE "acceso"."recuperaciones_contrasena" (
    "id_recuperacion" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "resumen_token" TEXT NOT NULL,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "fecha_consumo" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recuperaciones_contrasena_pkey" PRIMARY KEY ("id_recuperacion")
);

-- CreateTable
CREATE TABLE "acceso"."intentos_acceso" (
    "id_intento" TEXT NOT NULL,
    "identificador_normalizado" TEXT NOT NULL,
    "fecha_intento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intentos_acceso_pkey" PRIMARY KEY ("id_intento")
);

-- CreateIndex
CREATE UNIQUE INDEX "recuperaciones_contrasena_resumen_token_key" ON "acceso"."recuperaciones_contrasena"("resumen_token");

-- CreateIndex
CREATE INDEX "intentos_acceso_identificador_normalizado_fecha_intento_idx" ON "acceso"."intentos_acceso"("identificador_normalizado", "fecha_intento");

-- AddForeignKey
ALTER TABLE "acceso"."recuperaciones_contrasena" ADD CONSTRAINT "recuperaciones_contrasena_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "acceso"."usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
