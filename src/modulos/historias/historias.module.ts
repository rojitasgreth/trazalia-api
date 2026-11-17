import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';
import { ActualizarHistoriaCasoUso } from './casos-uso/actualizar-historia.caso-uso.js';
import { ArchivarHistoriaCasoUso } from './casos-uso/archivar-historia.caso-uso.js';
import { DesarchivarHistoriaCasoUso } from './casos-uso/desarchivar-historia.caso-uso.js';
import { EliminarHistoriaCasoUso } from './casos-uso/eliminar-historia.caso-uso.js';
import { MarcarHistoriaActivaCasoUso } from './casos-uso/marcar-historia-activa.caso-uso.js';
import { BuscarCoincidenciasCasoUso } from './casos-uso/buscar-coincidencias.caso-uso.js';
import { CrearHistoriaCasoUso } from './casos-uso/crear-historia.caso-uso.js';
import { ListarHistoriasCasoUso } from './casos-uso/listar-historias.caso-uso.js';
import { ObtenerHistoriaCasoUso } from './casos-uso/obtener-historia.caso-uso.js';
import { HistoriasController } from './historias.controller.js';
import { REGISTROS_CLINICOS, SinRegistrosClinicos } from './puertos/registros-clinicos.js';
import { HistoriaRepositorio } from './repositorios/historia.repositorio.js';

// Módulo B — Historias clínicas (SPEC v1.3). Usa de Acceso solo sus guardias
// exportadas y de Auditoría su servicio público (Documento Cero §5).
@Module({
  imports: [AccesoModule, AuditoriaModule],
  controllers: [HistoriasController],
  providers: [
    HistoriaRepositorio,
    ActualizarHistoriaCasoUso,
    ArchivarHistoriaCasoUso,
    BuscarCoincidenciasCasoUso,
    DesarchivarHistoriaCasoUso,
    EliminarHistoriaCasoUso,
    MarcarHistoriaActivaCasoUso,
    CrearHistoriaCasoUso,
    ListarHistoriasCasoUso,
    ObtenerHistoriaCasoUso,
    { provide: REGISTROS_CLINICOS, useClass: SinRegistrosClinicos },
  ],
  // Interfaz pública para el futuro módulo de valoraciones (RF-017).
  exports: [MarcarHistoriaActivaCasoUso],
})
export class HistoriasModule {}
