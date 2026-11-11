import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

function crearContexto(rol: string) {
  const handler = vi.fn();
  const clase = vi.fn();
  return {
    getHandler: () => handler,
    getClass: () => clase,
    switchToHttp: () => ({
      getRequest: () => ({ usuarioAutenticado: { rol } }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('permite el acceso si no hay roles declarados', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    expect(new RolesGuard(reflector).canActivate(crearContexto('FISIOTERAPEUTA'))).toBe(true);
  });

  it('permite el acceso si el rol del usuario está en la lista permitida', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['ADMINISTRADOR']),
    } as unknown as Reflector;

    expect(new RolesGuard(reflector).canActivate(crearContexto('ADMINISTRADOR'))).toBe(true);
  });

  it('rechaza si el rol del usuario no está en la lista permitida', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['ADMINISTRADOR']),
    } as unknown as Reflector;

    expect(() => new RolesGuard(reflector).canActivate(crearContexto('FISIOTERAPEUTA'))).toThrow(
      ForbiddenException,
    );
  });

  it('lee la metadata tanto del handler como de la clase (@Roles() vive en el controlador)', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['ADMINISTRADOR']),
    } as unknown as Reflector;
    const contexto = crearContexto('ADMINISTRADOR');

    new RolesGuard(reflector).canActivate(contexto);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(expect.any(String), [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
  });
});
