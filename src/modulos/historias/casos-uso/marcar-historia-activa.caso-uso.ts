import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../generado/prisma/client.js';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';
import { aHistoriaDetalle } from '../vista/historia-vista.js';

/**
 * RF-017 / AC-012: interfaz pública para el módulo de valoraciones (fase
 * posterior). Al completarse la primera valoración, la historia pasa de
 * Borrador a Activa; una Activa nunca vuelve a Borrador. No tiene endpoint HTTP.
 */
@Injectable()
export class MarcarHistoriaActivaCasoUso {
  constructor(
    private readonly historias: HistoriaRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idFisioterapeuta: string, idHistoria: string): Promise<void> {
    const historia = await this.historias.buscarPorId(idFisioterapeuta, idHistoria);
    if (!historia) {
      throw new NotFoundException();
    }
    if (historia.estado === 'ACTIVA') return;
    if (historia.archivada) {
      throw new ConflictException({ mensaje: 'La historia está archivada.' });
    }
    // RF-016: la valoración solo pudo iniciarse con los datos personales
    // completos (en infantil, con el representante).
    if (aHistoriaDetalle(historia, []).camposFaltantes.length > 0) {
      throw new ConflictException({
        mensaje: 'Los datos personales deben estar completos antes de la primera valoración.',
      });
    }

    await this.historias.marcarActiva(idFisioterapeuta, idHistoria);
    await this.auditoria.registrar({
      idUsuarioActor: idFisioterapeuta,
      tipoEvento: 'activacion_historia',
      resultado: 'EXITOSO',
      metadatosMinimos: { idHistoria },
    });
  }

  /**
   * SPEC C RF-C13: al finalizar la valoración, la historia pasa a Activa en la
   * misma transacción. El módulo valoraciones ya comprobó la historia antes de
   * abrir la transacción; aquí solo se exige que siga en Borrador y sin archivar.
   */
  async ejecutarEnTransaccion(
    tx: Pick<Prisma.TransactionClient, 'historiaClinica' | 'eventoAuditoria'>,
    idFisioterapeuta: string,
    idHistoria: string,
  ): Promise<void> {
    const { count } = await tx.historiaClinica.updateMany({
      where: { idHistoria, idFisioterapeuta, estado: 'BORRADOR', archivada: false },
      data: { estado: 'ACTIVA' },
    });
    if (count === 0) {
      throw new ConflictException({ mensaje: 'La historia ya no está en Borrador.' });
    }
    await this.auditoria.registrarEnTransaccion(tx, {
      idUsuarioActor: idFisioterapeuta,
      tipoEvento: 'activacion_historia',
      resultado: 'EXITOSO',
      metadatosMinimos: { idHistoria },
    });
  }
}
