import type { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { COOKIE_ACCESO, COOKIE_RENOVACION, CookiesServicio } from './cookies.servicio.js';

function crearConfig(nodeEnv: string): ConfigService<never, true> {
  return { get: () => nodeEnv } as unknown as ConfigService<never, true>;
}

function crearRespuestaFalsa(): Response {
  return { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as Response;
}

describe('CookiesServicio', () => {
  it('marca secure en producción', () => {
    const servicio = new CookiesServicio(crearConfig('production'));
    const res = crearRespuestaFalsa();

    servicio.establecerAcceso(res, 'token', new Date());

    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_ACCESO,
      'token',
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' }),
    );
  });

  it('no marca secure fuera de producción', () => {
    const servicio = new CookiesServicio(crearConfig('development'));
    const res = crearRespuestaFalsa();

    servicio.establecerRenovacion(res, 'token', new Date());

    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_RENOVACION,
      'token',
      expect.objectContaining({ secure: false, path: '/api/v1/autenticacion/renovar' }),
    );
  });

  it('limpia ambas cookies con sus rutas correctas', () => {
    const servicio = new CookiesServicio(crearConfig('development'));
    const res = crearRespuestaFalsa();

    servicio.limpiar(res);

    expect(res.clearCookie).toHaveBeenCalledWith(COOKIE_ACCESO, { path: '/' });
    expect(res.clearCookie).toHaveBeenCalledWith(COOKIE_RENOVACION, {
      path: '/api/v1/autenticacion/renovar',
    });
  });
});
