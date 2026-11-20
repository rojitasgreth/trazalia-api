import { Injectable } from '@nestjs/common';
import { ObtenerHistoriaCasoUso } from '../../historias/casos-uso/obtener-historia.caso-uso.js';
import type { HistoriaDetalle } from '../../historias/vista/historia-vista.js';
import type { Valoracion } from '../../../generado/prisma/client.js';
import { datosDeLaFicha, type DatosDeLaFicha } from '../dominio/datos-de-la-ficha.js';
import { fichaDe } from '../fichas/index.js';
import { ValoracionRepositorio } from '../repositorios/valoracion.repositorio.js';
import {
  aHistoriaDeLaValoracion,
  aVistaValoracion,
  type RespuestaValoracion,
} from '../vista/valoracion-vista.js';

/**
 * Carga la historia (a través de la interfaz pública de historias, que ya
 * responde 404 si es ajena: RF-C17/AC-C12) y su valoración, y arma la respuesta
 * común de todos los casos de uso.
 */
@Injectable()
export class ContextoValoracion {
  constructor(
    private readonly obtenerHistoria: ObtenerHistoriaCasoUso,
    private readonly valoraciones: ValoracionRepositorio,
  ) {}

  async cargar(
    idFisioterapeuta: string,
    idHistoria: string,
  ): Promise<{ historia: HistoriaDetalle; valoracion: Valoracion | null }> {
    const historia = await this.obtenerHistoria.ejecutar(idFisioterapeuta, idHistoria);
    const valoracion = await this.valoraciones.buscarPorHistoria(idFisioterapeuta, idHistoria);
    return { historia, valoracion };
  }

  respuesta(
    historia: HistoriaDetalle,
    valoracion: Valoracion | null,
    ahora = new Date(),
  ): RespuestaValoracion {
    // Decisión del 19-11-2026: la finalizada muestra la foto tomada al finalizar.
    const datos =
      valoracion?.estado === 'FINALIZADA' && valoracion.datosPersonales
        ? (valoracion.datosPersonales as unknown as DatosDeLaFicha)
        : datosDeLaFicha(historia, ahora);
    return {
      historia: aHistoriaDeLaValoracion(historia),
      valoracion: valoracion ? aVistaValoracion(valoracion) : null,
      ficha: fichaDe(historia.tipo, valoracion?.versionFicha),
      datos,
    };
  }
}
