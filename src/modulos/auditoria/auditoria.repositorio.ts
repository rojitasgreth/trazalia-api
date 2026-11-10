import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../compartido/prisma/prisma.service.js';
import type { Prisma } from '../../generado/prisma/client.js';

export interface NuevoEventoAuditoria {
  idUsuarioActor?: string;
  idUsuarioAfectado?: string;
  tipoEvento: string;
  resultado: string;
  metadatosMinimos?: Record<string, unknown>;
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
}
