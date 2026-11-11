import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../compartido/prisma/prisma.service.js';
import type { EventoAuditoria, Prisma } from '../../generado/prisma/client.js';

export interface NuevoEventoAuditoria {
  idUsuarioActor?: string;
  idUsuarioAfectado?: string;
  tipoEvento: string;
  resultado: string;
  metadatosMinimos?: Record<string, unknown>;
}

export interface FiltrosAuditoria {
  tipoEvento?: string;
  resultado?: string;
  idUsuario?: string;
  desde?: Date;
  hasta?: Date;
  pagina: number;
  porPagina: number;
}

export interface PaginaEventosAuditoria {
  datos: EventoAuditoria[];
  total: number;
}

@Injectable()
export class AuditoriaRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async crear(evento: NuevoEventoAuditoria): Promise<void> {
    await this.prisma.eventoAuditoria.create({
      data: {
        ...evento,
        metadatosMinimos: evento.metadatosMinimos as Prisma.InputJsonValue | undefined,
      },
    });
  }

  /** BR-028/AC-027: solo lectura, con filtros y paginación; nunca expone secretos (ya no se guardan). */
  async listar(filtros: FiltrosAuditoria): Promise<PaginaEventosAuditoria> {
    const where = {
      ...(filtros.tipoEvento ? { tipoEvento: filtros.tipoEvento } : {}),
      ...(filtros.resultado ? { resultado: filtros.resultado } : {}),
      ...(filtros.idUsuario
        ? {
            OR: [{ idUsuarioActor: filtros.idUsuario }, { idUsuarioAfectado: filtros.idUsuario }],
          }
        : {}),
      ...(filtros.desde || filtros.hasta
        ? {
            fechaEvento: {
              ...(filtros.desde ? { gte: filtros.desde } : {}),
              ...(filtros.hasta ? { lte: filtros.hasta } : {}),
            },
          }
        : {}),
    };

    const [datos, total] = await Promise.all([
      this.prisma.eventoAuditoria.findMany({
        where,
        orderBy: { fechaEvento: 'desc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
      }),
      this.prisma.eventoAuditoria.count({ where }),
    ]);
    return { datos, total };
  }
}
