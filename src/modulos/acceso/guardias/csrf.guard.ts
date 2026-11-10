import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

export const COOKIE_CSRF = 'XSRF-TOKEN';
const CABECERA_CSRF = 'x-xsrf-token';

// DP-08: double-submit (cookie XSRF-TOKEN + cabecera X-XSRF-TOKEN). La cookie
// la emite el middleware de csrf.middleware.ts en cada respuesta.
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const cookie = request.cookies?.[COOKIE_CSRF];
    const cabecera = request.headers[CABECERA_CSRF];

    if (typeof cookie !== 'string' || cookie.length === 0 || cabecera !== cookie) {
      throw new ForbiddenException('Protección CSRF inválida');
    }
    return true;
  }
}
