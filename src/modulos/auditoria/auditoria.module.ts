import { Module } from '@nestjs/common';
import { AuditoriaRepositorio } from './auditoria.repositorio.js';
import { AuditoriaServicio } from './auditoria.servicio.js';
import { ListarAuditoriaCasoUso } from './casos-uso/listar-auditoria.caso-uso.js';

// AuditoriaController vive en AccesoModule: necesita AutenticacionGuard y
// RolesGuard, que a su vez necesita AuditoriaServicio para auditar accesos
// denegados (AC-026) — ponerlo aquí crearía un ciclo de módulos con Acceso.
@Module({
  providers: [AuditoriaRepositorio, AuditoriaServicio, ListarAuditoriaCasoUso],
  exports: [AuditoriaServicio, ListarAuditoriaCasoUso],
})
export class AuditoriaModule {}
