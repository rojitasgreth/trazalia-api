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

export interface DatosUsuarioEditables {
  nombre?: string;
  apellido?: string;
  telefono?: string | null;
  correo?: string;
}

export interface FiltrosUsuarios {
  texto?: string;
  rol?: RolUsuario;
  estado?: EstadoCuenta;
  pagina: number;
  porPagina: number;
}

export interface PaginaUsuarios {
  datos: Usuario[];
  total: number;
}

export interface ResultadoCambioProtegido {
  // false: la operación habría dejado al sistema sin ningún ADMINISTRADOR
  // ACTIVO (BR-033); no se aplicó ningún cambio.
  ok: boolean;
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

  /** BR-035: bloqueo automático por intentos fallidos. */
  async bloquear(idUsuario: string, bloqueadoHasta: Date): Promise<void> {
    await this.prisma.usuario.update({
      where: { idUsuario },
      data: { estado: 'BLOQUEADO', bloqueadoHasta },
    });
  }

  /** Levanta un BLOQUEADO: automáticamente al vencer el plazo o por un administrador. */
  async desbloquear(idUsuario: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { idUsuario },
      data: { estado: 'ACTIVO', bloqueadoHasta: null },
    });
  }

  /** BR-013/014: también levanta un BLOQUEADO, ya que probar el correo es una señal más fuerte que esperar el plazo. */
  async actualizarContrasena(idUsuario: string, hashContrasena: string): Promise<Usuario> {
    return this.prisma.usuario.update({
      where: { idUsuario },
      data: { hashContrasena, estado: 'ACTIVO', bloqueadoHasta: null },
    });
  }

  async listar(filtros: FiltrosUsuarios): Promise<PaginaUsuarios> {
    const where = {
      ...(filtros.rol ? { rol: filtros.rol } : {}),
      ...(filtros.estado ? { estado: filtros.estado } : {}),
      ...(filtros.texto
        ? {
            OR: [
              { nombre: { contains: filtros.texto, mode: 'insensitive' as const } },
              { apellido: { contains: filtros.texto, mode: 'insensitive' as const } },
              { correo: { contains: filtros.texto, mode: 'insensitive' as const } },
              { nombreUsuario: { contains: filtros.texto, mode: 'insensitive' as const } },
              { cedula: { contains: filtros.texto, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [datos, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
      }),
      this.prisma.usuario.count({ where }),
    ]);
    return { datos, total };
  }

  async actualizarDatos(idUsuario: string, datos: DatosUsuarioEditables): Promise<Usuario> {
    return this.prisma.usuario.update({
      where: { idUsuario },
      data: {
        ...datos,
        correo: datos.correo ? datos.correo.trim().toLowerCase() : undefined,
      },
    });
  }

  /** BR-033: rechaza el cambio si dejaría al sistema sin ningún administrador ACTIVO. */
  async cambiarEstadoProtegido(
    idUsuario: string,
    nuevoEstado: EstadoCuenta,
  ): Promise<ResultadoCambioProtegido> {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUniqueOrThrow({ where: { idUsuario } });
      if (
        usuario.rol === 'ADMINISTRADOR' &&
        usuario.estado === 'ACTIVO' &&
        nuevoEstado !== 'ACTIVO'
      ) {
        const activos = await tx.usuario.count({
          where: { rol: 'ADMINISTRADOR', estado: 'ACTIVO' },
        });
        if (activos <= 1) {
          return { ok: false };
        }
      }
      await tx.usuario.update({ where: { idUsuario }, data: { estado: nuevoEstado } });
      return { ok: true };
    });
  }

  /** BR-033: rechaza quitarle el rol ADMINISTRADOR al único administrador ACTIVO. */
  async cambiarRolProtegido(
    idUsuario: string,
    nuevoRol: RolUsuario,
  ): Promise<ResultadoCambioProtegido> {
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findUniqueOrThrow({ where: { idUsuario } });
      if (
        usuario.rol === 'ADMINISTRADOR' &&
        usuario.estado === 'ACTIVO' &&
        nuevoRol !== 'ADMINISTRADOR'
      ) {
        const activos = await tx.usuario.count({
          where: { rol: 'ADMINISTRADOR', estado: 'ACTIVO' },
        });
        if (activos <= 1) {
          return { ok: false };
        }
      }
      await tx.usuario.update({ where: { idUsuario }, data: { rol: nuevoRol } });
      return { ok: true };
    });
  }
}
