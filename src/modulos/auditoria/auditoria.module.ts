import { Module } from '@nestjs/common';
import { AuditoriaRepositorio } from './auditoria.repositorio.js';
import { AuditoriaServicio } from './auditoria.servicio.js';

@Module({
  providers: [AuditoriaRepositorio, AuditoriaServicio],
  exports: [AuditoriaServicio],
})
export class AuditoriaModule {}
