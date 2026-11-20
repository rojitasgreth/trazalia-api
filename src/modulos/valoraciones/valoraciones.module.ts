import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';
import { HistoriasModule } from '../historias/historias.module.js';
import { ContextoValoracion } from './casos-uso/contexto-valoracion.js';
import { FinalizarValoracionCasoUso } from './casos-uso/finalizar-valoracion.caso-uso.js';
import { GuardarValoracionCasoUso } from './casos-uso/guardar-valoracion.caso-uso.js';
import { IniciarValoracionCasoUso } from './casos-uso/iniciar-valoracion.caso-uso.js';
import { ObtenerValoracionCasoUso } from './casos-uso/obtener-valoracion.caso-uso.js';
import { RegistrarImpresionCasoUso } from './casos-uso/registrar-impresion.caso-uso.js';
import { ValoracionRepositorio } from './repositorios/valoracion.repositorio.js';
import { ValoracionesController } from './valoraciones.controller.js';

// Módulo C — Valoraciones (SPEC v1.1, ADR-0005). Usa de historias solo su
// interfaz pública (obtener la historia y marcarla Activa) y es dueño del
// esquema valoraciones (Documento Cero §5).
@Module({
  imports: [AccesoModule, AuditoriaModule, HistoriasModule],
  controllers: [ValoracionesController],
  providers: [
    ValoracionRepositorio,
    ContextoValoracion,
    ObtenerValoracionCasoUso,
    IniciarValoracionCasoUso,
    GuardarValoracionCasoUso,
    FinalizarValoracionCasoUso,
    RegistrarImpresionCasoUso,
  ],
})
export class ValoracionesModule {}
