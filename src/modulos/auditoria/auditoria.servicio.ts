import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../../generado/prisma/client.js';
import { AuditoriaRepositorio, type NuevoEventoAuditoria } from './auditoria.repositorio.js';

// Interfaz pública del módulo auditoria (Documento Cero §5: los módulos no se
// tocan las tablas entre sí, solo se llaman a través de servicios públicos).
@Injectable()
export class AuditoriaServicio {
  private readonly logger = new Logger(AuditoriaServicio.name);

  constructor(private readonly repositorio: AuditoriaRepositorio) {}

  /**
   * Registra un evento de auditoría. Nunca debe lanzar: un fallo de auditoría
   * no puede impedir ni revertir la operación de negocio que la originó.
   */
  async registrar(evento: NuevoEventoAuditoria): Promise<void> {
    try {
      await this.repositorio.crear(evento);
    } catch (error) {
      this.logger.error(
        `No se pudo registrar el evento de auditoría "${evento.tipoEvento}"`,
        error,
      );
    }
  }

  /**
   * Registra el evento dentro de la transacción de la operación de negocio.
   * A diferencia de `registrar`, sí lanza: si la auditoría es obligatoria
   * (p. ej. el borrado definitivo de una historia, SPEC B §13.3), la operación
   * se revierte cuando no puede auditarse.
   */
  async registrarEnTransaccion(
    tx: Pick<Prisma.TransactionClient, 'eventoAuditoria'>,
    evento: NuevoEventoAuditoria,
  ): Promise<void> {
    await this.repositorio.crear(evento, tx);
  }
}
