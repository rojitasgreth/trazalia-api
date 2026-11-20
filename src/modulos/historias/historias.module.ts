import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';
import { CentrosModule } from '../centros/centros.module.js';
import { RegistrosClinicosDeValoraciones } from '../valoraciones/lectura/registros-clinicos-de-valoraciones.js';
import { ValoracionesLecturaModule } from '../valoraciones/lectura/valoraciones-lectura.module.js';
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
import { REGISTROS_CLINICOS } from './puertos/registros-clinicos.js';
import { HistoriaRepositorio } from './repositorios/historia.repositorio.js';

// Módulo B — Historias clínicas (SPEC v1.6). Usa de Acceso solo sus guardias
// exportadas y de Auditoría su servicio público (Documento Cero §5).
@Module({
  imports: [AccesoModule, AuditoriaModule, CentrosModule, ValoracionesLecturaModule],
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
    // SPEC C (decisión del 19-11-2026): una valoración, en curso o finalizada,
    // es un registro clínico; la historia ya no se elimina, se archiva.
    { provide: REGISTROS_CLINICOS, useExisting: RegistrosClinicosDeValoraciones },
  ],
  // Interfaz pública para el módulo valoraciones (RF-017, SPEC C §6).
  exports: [MarcarHistoriaActivaCasoUso, ObtenerHistoriaCasoUso],
})
export class HistoriasModule {}
