import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { Entorno } from '../../../configuracion/entorno.js';

// DP-08: mismo dominio, SameSite=Lax. HttpOnly y Secure siempre (Secure
// efectivo detrás de TLS en producción; en desarrollo HTTP local se mantiene
// el atributo igualmente, como indica el spec §9.1).
export const COOKIE_ACCESO = 'access_token';
export const COOKIE_RENOVACION = 'refresh_token';
const RUTA_RENOVACION = '/api/v1/autenticacion/renovar';

@Injectable()
export class CookiesServicio {
  constructor(private readonly config: ConfigService<Entorno, true>) {}

  private get esProduccion(): boolean {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  establecerAcceso(res: Response, token: string, expira: Date): void {
    res.cookie(COOKIE_ACCESO, token, {
      httpOnly: true,
      secure: this.esProduccion,
      sameSite: 'lax',
      path: '/',
      expires: expira,
    });
  }

  establecerRenovacion(res: Response, token: string, expira: Date): void {
    res.cookie(COOKIE_RENOVACION, token, {
      httpOnly: true,
      secure: this.esProduccion,
      sameSite: 'lax',
      path: RUTA_RENOVACION,
      expires: expira,
    });
  }

  limpiar(res: Response): void {
    res.clearCookie(COOKIE_ACCESO, { path: '/' });
    res.clearCookie(COOKIE_RENOVACION, { path: RUTA_RENOVACION });
  }
}
