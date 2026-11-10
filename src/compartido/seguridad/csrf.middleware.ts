import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { COOKIE_CSRF } from '../../modulos/acceso/guardias/csrf.guard.js';

/**
 * Emite la cookie XSRF-TOKEN (no HttpOnly: Angular la lee para reenviarla en
 * X-XSRF-TOKEN, DP-08) si todavía no existe. Debe registrarse antes que las
 * rutas para que esté disponible desde la primera solicitud del cliente.
 */
export function crearMiddlewareCsrf(esProduccion: boolean) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.cookies?.[COOKIE_CSRF]) {
      res.cookie(COOKIE_CSRF, randomBytes(32).toString('base64url'), {
        httpOnly: false,
        secure: esProduccion,
        sameSite: 'lax',
        path: '/',
      });
    }
    next();
  };
}
