import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { RolUsuario } from '../../../generado/prisma/enums.js';
import { COOKIE_ACCESO } from '../jwt/cookies.servicio.js';
import { JwtServicio } from '../jwt/jwt.servicio.js';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { expiroPorInactividad } from '../sesiones/politica-inactividad.js';

export interface UsuarioAutenticado {
  idUsuario: string;
  rol: RolUsuario;
  idSesion: string;
}

export interface RequestAutenticado extends Request {
  usuarioAutenticado: UsuarioAutenticado;
}

// BR-036: cada solicitud autenticada valida la sesión contra el servidor
// (revocación, estado de la cuenta e inactividad) — nunca basta el JWT solo.
@Injectable()
export class AutenticacionGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtServicio,
    private readonly sesionRepositorio: SesionRepositorio,
    private readonly usuarioRepositorio: UsuarioRepositorio,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token: unknown = request.cookies?.[COOKIE_ACCESO];
    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException();
    }

    const verificado = await this.jwt.verificarAcceso(token).catch(() => null);
    if (!verificado) {
      throw new UnauthorizedException();
    }

    const sesion = await this.sesionRepositorio.buscarPorId(verificado.claims.sid);
    if (!sesion || sesion.fechaRevocacion) {
      throw new UnauthorizedException();
    }
    if (expiroPorInactividad(sesion.ultimaActividad)) {
      await this.sesionRepositorio.revocar(sesion.idSesion, 'inactividad');
      throw new UnauthorizedException();
    }

    const usuario = await this.usuarioRepositorio.buscarPorId(verificado.claims.sub);
    if (!usuario || usuario.estado !== 'ACTIVO') {
      throw new UnauthorizedException();
    }

    (request as RequestAutenticado).usuarioAutenticado = {
      idUsuario: usuario.idUsuario,
      rol: usuario.rol,
      idSesion: sesion.idSesion,
    };
    return true;
  }
}
