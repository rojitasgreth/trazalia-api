import type { NextFunction, Request, Response } from 'express';
import { COOKIE_CSRF } from '../../modulos/acceso/guardias/csrf.guard.js';
import { crearMiddlewareCsrf } from './csrf.middleware.js';

describe('crearMiddlewareCsrf', () => {
  it('emite la cookie XSRF-TOKEN cuando no existe', () => {
    const req = { cookies: {} } as unknown as Request;
    const res = { cookie: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    crearMiddlewareCsrf(false)(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE_CSRF,
      expect.any(String),
      expect.objectContaining({ httpOnly: false, secure: false, sameSite: 'lax' }),
    );
    expect(next).toHaveBeenCalledOnce();
  });

  it('no sobrescribe la cookie si ya existe', () => {
    const req = { cookies: { [COOKIE_CSRF]: 'ya-existe' } } as unknown as Request;
    const res = { cookie: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    crearMiddlewareCsrf(true)(req, res, next);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});
