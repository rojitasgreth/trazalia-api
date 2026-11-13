import { Module } from '@nestjs/common';
import { AuditoriaRepositorio } from './auditoria.repositorio.js';
import { AuditoriaServicio } from './auditoria.servicio.js';

// AuditoriaController y ListarAuditoriaCasoUso viven en AccesoModule:
// necesitan AutenticacionGuard/RolesGuard (que a su vez necesitan
// AuditoriaServicio para auditar accesos denegados, AC-026) y
// UsuarioRepositorio (para resolver nombres en la auditoría, AC-027) —
// ponerlos aquí crearía un ciclo de módulos con Acceso.
@Module({
  providers: [AuditoriaRepositorio, AuditoriaServicio],
  exports: [AuditoriaRepositorio, AuditoriaServicio],
})
export class AuditoriaModule {}
