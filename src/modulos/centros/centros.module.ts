import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';
import { BuscarCentrosCasoUso } from './casos-uso/buscar-centros.caso-uso.js';
import { CrearCentroCasoUso } from './casos-uso/crear-centro.caso-uso.js';
import { CentrosController } from './centros.controller.js';
import { CentrosServicio } from './centros.servicio.js';
import { CentroRepositorio } from './repositorios/centro.repositorio.js';

// Catálogo compartido de centros médicos (SPEC B v1.4 §8.7, ADR-0004).
@Module({
  imports: [AccesoModule, AuditoriaModule],
  controllers: [CentrosController],
  providers: [CentroRepositorio, BuscarCentrosCasoUso, CrearCentroCasoUso, CentrosServicio],
  exports: [CentrosServicio],
})
export class CentrosModule {}
