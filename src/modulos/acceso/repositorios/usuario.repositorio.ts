import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import type { EstadoCuenta, Nacionalidad, RolUsuario } from '../../../generado/prisma/enums.js';
import type { Usuario } from '../../../generado/prisma/client.js';

export interface NuevoUsuario {
  nacionalidad: Nacionalidad;
  cedula: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  nombreUsuario: string;
  rol: RolUsuario;
}

@Injectable()
export class UsuarioRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(idUsuario: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { idUsuario } });
  }

  /** BR-010: el login acepta correo o nombre de usuario; el correo se normaliza (minúsculas). */
  async buscarPorIdentificador(identificador: string): Promise<Usuario | null> {
    const normalizado = identificador.trim().toLowerCase();
    return this.prisma.usuario.findFirst({
      where: { OR: [{ correo: normalizado }, { nombreUsuario: identificador.trim() }] },
    });
  }

  async crear(datos: NuevoUsuario): Promise<Usuario> {
    return this.prisma.usuario.create({
      data: { ...datos, correo: datos.correo.trim().toLowerCase(), estado: 'PENDIENTE' },
    });
  }

  async activarConContrasena(idUsuario: string, hashContrasena: string): Promise<Usuario> {
    return this.prisma.usuario.update({
      where: { idUsuario },
      data: { estado: 'ACTIVO', hashContrasena, fechaActivacion: new Date() },
    });
  }

  async registrarAcceso(idUsuario: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { idUsuario },
      data: { ultimoAcceso: new Date() },
    });
  }

  async actualizarEstado(idUsuario: string, estado: EstadoCuenta): Promise<void> {
    await this.prisma.usuario.update({ where: { idUsuario }, data: { estado } });
  }
}
