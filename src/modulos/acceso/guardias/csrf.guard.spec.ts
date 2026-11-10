import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { CsrfGuard } from './csrf.guard.js';

function crearContexto(cookie: unknown, cabecera: unknown): ExecutionContext {
  const request = {
    cookies: { 'XSRF-TOKEN': cookie },
    headers: { 'x-xsrf-token': cabecera },
  } as unknown as Request;
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();

  it('permite la solicitud cuando la cookie y la cabecera coinciden', () => {
    expect(guard.canActivate(crearContexto('token-123', 'token-123'))).toBe(true);
  });

  it('rechaza cuando no hay cookie', () => {
    expect(() => guard.canActivate(crearContexto(undefined, 'token-123'))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza cuando la cabecera no coincide con la cookie', () => {
    expect(() => guard.canActivate(crearContexto('token-123', 'token-distinto'))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza cuando falta la cabecera', () => {
    expect(() => guard.canActivate(crearContexto('token-123', undefined))).toThrow(
      ForbiddenException,
    );
  });
});
