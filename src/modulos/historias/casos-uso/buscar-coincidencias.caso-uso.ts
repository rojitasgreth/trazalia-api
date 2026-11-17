import { Injectable } from '@nestjs/common';
import { CAMPOS_NO_COMPARTIBLES } from '../dominio/campos-por-tipo.js';
import { normalizarCedula, textoONulo, type DatosPersonales } from '../dominio/datos-personales.js';
import type { BuscarCoincidenciasDto } from '../dto/buscar-coincidencias.dto.js';
import {
  HistoriaRepositorio,
  type HistoriaConRepresentante,
} from '../repositorios/historia.repositorio.js';
import {
  aDatosPersonales,
  aHistoriaResumen,
  type HistoriaResumen,
} from '../vista/historia-vista.js';

type DatosIdentificacion = Pick<
  DatosPersonales,
  'nombre' | 'apellido' | 'nacionalidad' | 'cedula' | 'sinDocumento' | 'fechaNacimiento'
>;

export type ResultadoCoincidencia =
  | { resultado: 'ninguna' }
  | { resultado: 'duplicado'; historia: HistoriaResumen }
  | { resultado: 'autocompletar'; historia: HistoriaResumen; datos: DatosPersonales };

// SPEC §7 y §10.1: coincidencias del mismo paciente, siempre dentro de las
// historias del fisioterapeuta autenticado (las de otros nunca se consultan).
@Injectable()
export class BuscarCoincidenciasCasoUso {
  constructor(private readonly historias: HistoriaRepositorio) {}

  /** RF-008/RF-009: por documento o, en infantil sin documento, por nombre + apellido + nacimiento. */
  async buscar(
    idFisioterapeuta: string,
    datos: DatosIdentificacion,
  ): Promise<HistoriaConRepresentante[]> {
    if (datos.nacionalidad && datos.cedula) {
      return this.historias.buscarPorDocumento(idFisioterapeuta, datos.nacionalidad, datos.cedula);
    }
    if (datos.sinDocumento && datos.nombre && datos.apellido && datos.fechaNacimiento) {
      return this.historias.buscarPorNombreYNacimiento(
        idFisioterapeuta,
        datos.nombre,
        datos.apellido,
        datos.fechaNacimiento,
      );
    }
    return [];
  }

  /**
   * B13/B14: antes de guardar, informa si hay un duplicado del mismo tipo o una
   * historia de otro tipo cuyos datos personales pueden reutilizarse (RF-012).
   */
  async ejecutar(
    idFisioterapeuta: string,
    consulta: BuscarCoincidenciasDto,
  ): Promise<ResultadoCoincidencia> {
    const sinDocumento = consulta.tipo === 'REHAB_INFANTIL' && consulta.sinDocumento === true;
    const coincidencias = await this.buscar(idFisioterapeuta, {
      nombre: consulta.nombre?.trim() ?? '',
      apellido: consulta.apellido?.trim() ?? '',
      nacionalidad: sinDocumento ? null : (consulta.nacionalidad ?? null),
      cedula: sinDocumento ? null : normalizarCedula(consulta.cedula),
      sinDocumento,
      fechaNacimiento: textoONulo(consulta.fechaNacimiento),
    });

    const mismoTipo = coincidencias.find((h) => h.tipo === consulta.tipo);
    if (mismoTipo) {
      return { resultado: 'duplicado', historia: aHistoriaResumen(mismoTipo) };
    }
    // La más reciente de otro tipo es la base del autocompletado.
    const origen = coincidencias[0];
    if (!origen) return { resultado: 'ninguna' };
    return {
      resultado: 'autocompletar',
      historia: aHistoriaResumen(origen),
      datos: datosCompartibles(aDatosPersonales(origen)),
    };
  }
}

/** §8.2/§8.3: fuente de información y demandas físicas no se copian a otro tipo. */
function datosCompartibles(datos: DatosPersonales): DatosPersonales {
  const copia = { ...datos };
  for (const campo of CAMPOS_NO_COMPARTIBLES) {
    if (campo === 'fuenteInformacion') copia.fuenteInformacion = [];
    else copia[campo] = null;
  }
  return copia;
}
