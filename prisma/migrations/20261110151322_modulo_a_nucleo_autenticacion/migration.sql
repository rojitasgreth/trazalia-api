-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "acceso";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auditoria";

-- CreateEnum
CREATE TYPE "acceso"."Nacionalidad" AS ENUM ('V', 'E');

-- CreateEnum
CREATE TYPE "acceso"."RolUsuario" AS ENUM ('ADMINISTRADOR', 'FISIOTERAPEUTA');

-- CreateEnum
CREATE TYPE "acceso"."EstadoCuenta" AS ENUM ('PENDIENTE', 'ACTIVO', 'BLOQUEADO', 'SUSPENDIDO', 'INACTIVO');

-- CreateTable
CREATE TABLE "acceso"."usuarios" (
    "id_usuario" TEXT NOT NULL,
    "nacionalidad" "acceso"."Nacionalidad" NOT NULL,
    "cedula" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "telefono" TEXT,
    "nombre_usuario" TEXT NOT NULL,
    "hash_contrasena" TEXT,
    "rol" "acceso"."RolUsuario" NOT NULL,
    "estado" "acceso"."EstadoCuenta" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,
    "fecha_activacion" TIMESTAMP(3),
    "ultimo_acceso" TIMESTAMP(3),
    "bloqueado_hasta" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "acceso"."invitaciones_usuario" (
    "id_invitacion" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "resumen_token" TEXT NOT NULL,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "fecha_consumo" TIMESTAMP(3),
    "id_administrador_creador" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitaciones_usuario_pkey" PRIMARY KEY ("id_invitacion")
);

-- CreateTable
CREATE TABLE "acceso"."sesiones_usuario" (
    "id_sesion" TEXT NOT NULL,
    "id_usuario" TEXT NOT NULL,
    "etiqueta_dispositivo" TEXT,
    "resumen_jti_refresh" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_actividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "fecha_revocacion" TIMESTAMP(3),
    "motivo_revocacion" TEXT,

    CONSTRAINT "sesiones_usuario_pkey" PRIMARY KEY ("id_sesion")
);

-- CreateTable
CREATE TABLE "acceso"."registros_token_renovacion" (
    "id_registro_token" TEXT NOT NULL,
    "id_sesion" TEXT NOT NULL,
    "resumen_jti" TEXT NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "fecha_consumo" TIMESTAMP(3),
    "fecha_revocacion" TIMESTAMP(3),
    "reemplazado_por" TEXT,

    CONSTRAINT "registros_token_renovacion_pkey" PRIMARY KEY ("id_registro_token")
);

-- CreateTable
CREATE TABLE "auditoria"."eventos_auditoria" (
    "id_evento" TEXT NOT NULL,
    "id_usuario_actor" TEXT,
    "id_usuario_afectado" TEXT,
    "tipo_evento" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "metadatos_minimos" JSONB,
    "fecha_evento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_auditoria_pkey" PRIMARY KEY ("id_evento")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "acceso"."usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_nombre_usuario_key" ON "acceso"."usuarios"("nombre_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_nacionalidad_cedula_key" ON "acceso"."usuarios"("nacionalidad", "cedula");

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_usuario_resumen_token_key" ON "acceso"."invitaciones_usuario"("resumen_token");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_usuario_resumen_jti_refresh_key" ON "acceso"."sesiones_usuario"("resumen_jti_refresh");

-- CreateIndex
CREATE UNIQUE INDEX "registros_token_renovacion_resumen_jti_key" ON "acceso"."registros_token_renovacion"("resumen_jti");

-- CreateIndex
CREATE UNIQUE INDEX "registros_token_renovacion_reemplazado_por_key" ON "acceso"."registros_token_renovacion"("reemplazado_por");

-- AddForeignKey
ALTER TABLE "acceso"."invitaciones_usuario" ADD CONSTRAINT "invitaciones_usuario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "acceso"."usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceso"."invitaciones_usuario" ADD CONSTRAINT "invitaciones_usuario_id_administrador_creador_fkey" FOREIGN KEY ("id_administrador_creador") REFERENCES "acceso"."usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceso"."sesiones_usuario" ADD CONSTRAINT "sesiones_usuario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "acceso"."usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceso"."registros_token_renovacion" ADD CONSTRAINT "registros_token_renovacion_id_sesion_fkey" FOREIGN KEY ("id_sesion") REFERENCES "acceso"."sesiones_usuario"("id_sesion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceso"."registros_token_renovacion" ADD CONSTRAINT "registros_token_renovacion_reemplazado_por_fkey" FOREIGN KEY ("reemplazado_por") REFERENCES "acceso"."registros_token_renovacion"("id_registro_token") ON DELETE SET NULL ON UPDATE CASCADE;
