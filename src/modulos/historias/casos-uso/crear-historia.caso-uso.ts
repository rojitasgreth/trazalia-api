import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { esConflictoDeUnicidad } from '../../../compartido/prisma/errores.js';
import type { TipoHistoria } from '../../../generado/prisma/enums.js';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { CentrosServicio } from '../../centros/centros.servicio.js';
import { exigirCentroExistente } from '../dominio/centro-de-historia.js';

import { BuscarCoincidenciasCasoUso } from './buscar-coincidencias.caso-uso.js';
import { validarIdentificacion, validarRepresentante } from '../dominio/identificacion.js';
import { normalizarDatosPersonales, normalizarRepresentante } from '../dominio/normalizar.js';
import type { DatosPersonalesDto } from '../dto/datos-personales.dto.js';
import type { RepresentanteDto } from '../dto/representante.dto.js';
import {
  HistoriaRepositorio,
  type HistoriaConRepresentante,
} from '../repositorios/historia.repositorio.js';
import { aHistoriaDetalle, type HistoriaDetalle } from '../vista/historia-vista.js';

export interface CrearHistoriaComando extends DatosPersonalesDto {
  tipo: TipoHistoria;
  representante?: RepresentanteDto | null;
}

// Flujo §6 pasos 3–9 / RF-002, RF-006, RF-008–RF-011, RF-025.
@Injectable()
export class CrearHistoriaCasoUso {
  constructor(
    private readonly historias: HistoriaRepositorio,
    private readonly coincidencias: BuscarCoincidenciasCasoUso,
    private readonly auditoria: AuditoriaServicio,
    private readonly centros: CentrosServicio,
  ) {}

  async ejecutar(
    idFisioterapeuta: string,
    comando: CrearHistoriaComando,
  ): Promise<HistoriaDetalle> {
    const { tipo } = comando;
    const datos = normalizarDatosPersonales(tipo, comando);
    // RF-027/AC-011: la historia infantil puede crearse sin representante.
    const representante = normalizarRepresentante(tipo, comando.representante);

    const errores = [...validarIdentificacion(tipo, datos), ...validarRepresentante(representante)];
    if (errores.length > 0) {
      throw new BadRequestException({ mensaje: 'Faltan datos para crear la historia.', errores });
    }

    const centro = await exigirCentroExistente(this.centros, datos.idCentro);

    // §7.2: las coincidencias solo se buscan entre las historias propias; las
    // de otro fisioterapeuta nunca se consultan ni se revelan.
    const coincidencias = await this.coincidencias.buscar(idFisioterapeuta, datos);
    this.rechazarSiDuplicada(coincidencias, tipo);
    // Mismo paciente con otro tipo: la nueva historia se enlaza a su ancla.
    const idPaciente = coincidencias[0]?.idPaciente ?? null;

    let historia: HistoriaConRepresentante;
    try {
      historia = await this.historias.crear(
        idFisioterapeuta,
        idPaciente,
        tipo,
        datos,
        representante,
      );
    } catch (error) {
      // Otra solicitud creó la misma historia entre la búsqueda y el INSERT:
      // el índice único parcial lo impide (§18, concurrencia).
      if (esConflictoDeUnicidad(error)) {
        this.rechazarSiDuplicada(await this.coincidencias.buscar(idFisioterapeuta, datos), tipo);
        throw new ConflictException({ mensaje: 'La historia ya existe.' });
      }
      throw error;
    }

    await this.auditoria.registrar({
      idUsuarioActor: idFisioterapeuta,
      tipoEvento: 'creacion_historia',
      resultado: 'EXITOSO',
      metadatosMinimos: { idHistoria: historia.idHistoria, tipo },
    });

    const otras = await this.historias.listarOtrasDelPaciente(
      idFisioterapeuta,
      historia.idPaciente,
      historia.idHistoria,
    );
    return aHistoriaDetalle(historia, otras, false, centro);
  }

  /** RF-010: duplicado del mismo tipo → se bloquea y se ofrece abrir la existente. */
  private rechazarSiDuplicada(coincidencias: HistoriaConRepresentante[], tipo: TipoHistoria): void {
    const existente = coincidencias.find((h) => h.tipo === tipo);
    if (existente) {
      throw new ConflictException({
        mensaje: 'Este paciente ya tiene una historia de este tipo.',
        idHistoriaExistente: existente.idHistoria,
      });
    }
  }
}
