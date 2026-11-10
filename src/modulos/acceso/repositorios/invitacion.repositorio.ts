import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import type { InvitacionUsuario } from '../../../generado/prisma/client.js';

@Injectable()
export class InvitacionRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async crear(
    idUsuario: string,
    resumenToken: string,
    fechaExpiracion: Date,
    idAdministradorCreador?: string,
  ): Promise<InvitacionUsuario> {
    return this.prisma.invitacionUsuario.create({
      data: { idUsuario, resumenToken, fechaExpiracion, idAdministradorCreador },
    });
  }

  async buscarPorResumenToken(resumenToken: string): Promise<InvitacionUsuario | null> {
    return this.prisma.invitacionUsuario.findUnique({ where: { resumenToken } });
  }

  async marcarConsumida(idInvitacion: string): Promise<void> {
    await this.prisma.invitacionUsuario.update({
      where: { idInvitacion },
      data: { fechaConsumo: new Date() },
    });
  }
}
