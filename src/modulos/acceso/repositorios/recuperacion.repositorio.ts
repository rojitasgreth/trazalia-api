import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import type { RecuperacionContrasena } from '../../../generado/prisma/client.js';

@Injectable()
export class RecuperacionRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async crear(
    idUsuario: string,
    resumenToken: string,
    fechaExpiracion: Date,
  ): Promise<RecuperacionContrasena> {
    return this.prisma.recuperacionContrasena.create({
      data: { idUsuario, resumenToken, fechaExpiracion },
    });
  }

  async buscarPorResumenToken(resumenToken: string): Promise<RecuperacionContrasena | null> {
    return this.prisma.recuperacionContrasena.findUnique({ where: { resumenToken } });
  }

  async marcarConsumida(idRecuperacion: string): Promise<void> {
    await this.prisma.recuperacionContrasena.update({
      where: { idRecuperacion },
      data: { fechaConsumo: new Date() },
    });
  }

  /** BR-013: al emitir un nuevo enlace, el anterior deja de ser válido. */
  async invalidarVigentesDeUsuario(idUsuario: string): Promise<void> {
    await this.prisma.recuperacionContrasena.updateMany({
      where: { idUsuario, fechaConsumo: null, fechaExpiracion: { gt: new Date() } },
      data: { fechaConsumo: new Date() },
    });
  }
}
