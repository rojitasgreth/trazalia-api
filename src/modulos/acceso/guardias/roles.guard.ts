import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { RolUsuario } from '../../../generado/prisma/enums.js';
import type { RequestAutenticado } from './autenticacion.guard.js';
import { ROLES_CLAVE } from './roles.decorator.js';

// Siempre después de AutenticacionGuard: lee el rol que ese guard ya validó
// contra la base de datos, nunca un claim del JWT sin revalidar.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // @Roles() vive en el controlador (clase), no en cada handler, por eso
    // hay que mirar también context.getClass() y no solo el handler.
    const rolesPermitidos = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_CLAVE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!rolesPermitidos || rolesPermitidos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestAutenticado>();
    if (!rolesPermitidos.includes(request.usuarioAutenticado.rol)) {
      // AC-026: se deniega igual; el registro nunca bloquea la respuesta.
      void this.auditoria.registrar({
        idUsuarioActor: request.usuarioAutenticado.idUsuario,
        tipoEvento: 'acceso_denegado',
        resultado: 'DENEGADO',
        metadatosMinimos: {
          ruta: request.originalUrl ?? request.url,
          rolActual: request.usuarioAutenticado.rol,
          rolesPermitidos,
        },
      });
      throw new ForbiddenException();
    }
    return true;
  }
}
