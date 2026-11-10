import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import type { RegistroTokenRenovacion } from '../../../generado/prisma/client.js';

@Injectable()
export class RenovacionRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async crear(
    idSesion: string,
    resumenJti: string,
    fechaExpiracion: Date,
  ): Promise<RegistroTokenRenovacion> {
    return this.prisma.registroTokenRenovacion.create({
      data: { idSesion, resumenJti, fechaExpiracion },
    });
  }

  async buscarPorResumenJti(resumenJti: string): Promise<RegistroTokenRenovacion | null> {
    return this.prisma.registroTokenRenovacion.findUnique({ where: { resumenJti } });
  }

  /** AC-016: rota el refresh — marca el actual como consumido y lo liga al reemplazo. */
  async marcarConsumidoYReemplazado(
    idRegistroToken: string,
    reemplazadoPorId: string,
  ): Promise<void> {
    await this.prisma.registroTokenRenovacion.update({
      where: { idRegistroToken },
      data: { fechaConsumo: new Date(), reemplazadoPorId },
    });
  }

  /** AC-017: detectada la reutilización, se revoca toda la familia de la sesión. */
  async revocarFamiliaDeSesion(idSesion: string): Promise<void> {
    await this.prisma.registroTokenRenovacion.updateMany({
      where: { idSesion, fechaRevocacion: null },
      data: { fechaRevocacion: new Date() },
    });
  }
}
