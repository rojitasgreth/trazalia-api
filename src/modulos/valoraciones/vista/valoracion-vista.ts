import type { Valoracion } from '../../../generado/prisma/client.js';
import type { HistoriaDetalle } from '../../historias/vista/historia-vista.js';
import type { Contenido } from '../dominio/contenido.js';
import type { DatosDeLaFicha } from '../dominio/datos-de-la-ficha.js';
import type { Ficha } from '../fichas/index.js';

export interface VistaValoracion {
  idValoracion: string;
  estado: 'EN_CURSO' | 'FINALIZADA';
  versionFicha: number;
  version: number;
  contenido: Contenido;
  nombreFisioterapeuta: string;
  fechaInicio: string;
  fechaFinalizacion: string | null;
}

/** Lo mínimo de la historia que necesita la pantalla de valoración. */
export interface HistoriaDeLaValoracion {
  idHistoria: string;
  tipo: HistoriaDetalle['tipo'];
  estado: HistoriaDetalle['estado'];
  archivada: boolean;
  nombre: string;
  apellido: string;
  puedeIniciarValoracion: boolean;
  camposFaltantes: string[];
}

export interface RespuestaValoracion {
  historia: HistoriaDeLaValoracion;
  valoracion: VistaValoracion | null;
  ficha: Ficha;
  /** Vigentes mientras está En curso; la foto al finalizar después. */
  datos: DatosDeLaFicha;
}

export function aVistaValoracion(v: Valoracion): VistaValoracion {
  return {
    idValoracion: v.idValoracion,
    estado: v.estado,
    versionFicha: v.versionFicha,
    version: v.version,
    contenido: v.contenido as Contenido,
    nombreFisioterapeuta: v.nombreFisioterapeuta,
    fechaInicio: v.fechaInicio.toISOString(),
    fechaFinalizacion: v.fechaFinalizacion?.toISOString() ?? null,
  };
}

export function aHistoriaDeLaValoracion(h: HistoriaDetalle): HistoriaDeLaValoracion {
  return {
    idHistoria: h.idHistoria,
    tipo: h.tipo,
    estado: h.estado,
    archivada: h.archivada,
    nombre: h.nombre,
    apellido: h.apellido,
    puedeIniciarValoracion: h.puedeIniciarValoracion,
    camposFaltantes: h.camposFaltantes,
  };
}
