import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import type { SesionUsuario } from '../../../generado/prisma/client.js';

export interface NuevaSesion {
  idSesion: string;
  idUsuario: string;
  resumenJtiRefresh: string;
  fechaExpiracion: Date;
  etiquetaDispositivo?: string;
}

@Injectable()
export class SesionRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async crear(datos: NuevaSesion): Promise<SesionUsuario> {
    return this.prisma.sesionUsuario.create({ data: datos });
  }

  async buscarPorId(idSesion: string): Promise<SesionUsuario | null> {
    return this.prisma.sesionUsuario.findUnique({ where: { idSesion } });
  }

  async listarActivasDeUsuario(idUsuario: string): Promise<SesionUsuario[]> {
    return this.prisma.sesionUsuario.findMany({
      where: { idUsuario, fechaRevocacion: null },
      orderBy: { ultimaActividad: 'desc' },
    });
  }

  /** BR-036: solo la señal explícita de actividad humana actualiza esta marca. */
  async registrarActividad(idSesion: string): Promise<void> {
    await this.prisma.sesionUsuario.update({
      where: { idSesion },
      data: { ultimaActividad: new Date() },
    });
  }

  async actualizarJtiRefresh(
    idSesion: string,
    resumenJtiRefresh: string,
    fechaExpiracion: Date,
  ): Promise<void> {
    await this.prisma.sesionUsuario.update({
      where: { idSesion },
      data: { resumenJtiRefresh, fechaExpiracion },
    });
  }

  async revocar(idSesion: string, motivo: string): Promise<void> {
    await this.prisma.sesionUsuario.updateMany({
      where: { idSesion, fechaRevocacion: null },
      data: { fechaRevocacion: new Date(), motivoRevocacion: motivo },
    });
  }

  async revocarTodasDeUsuario(idUsuario: string, motivo: string): Promise<void> {
    await this.prisma.sesionUsuario.updateMany({
      where: { idUsuario, fechaRevocacion: null },
      data: { fechaRevocacion: new Date(), motivoRevocacion: motivo },
    });
  }
}
