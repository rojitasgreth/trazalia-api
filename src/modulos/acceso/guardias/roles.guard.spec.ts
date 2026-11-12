import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { RolesGuard } from './roles.guard.js';

function crearContexto(rol: string) {
  const handler = vi.fn();
  const clase = vi.fn();
  return {
    getHandler: () => handler,
    getClass: () => clase,
    switchToHttp: () => ({
      getRequest: () => ({ usuarioAutenticado: { idUsuario: 'u1', rol }, url: '/usuarios' }),
    }),
  } as unknown as ExecutionContext;
}

function crearAuditoria(): AuditoriaServicio {
  return { registrar: vi.fn().mockResolvedValue(undefined) } as unknown as AuditoriaServicio;
}

describe('RolesGuard', () => {
  it('permite el acceso si no hay roles declarados', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    expect(
      new RolesGuard(reflector, crearAuditoria()).canActivate(crearContexto('FISIOTERAPEUTA')),
    ).toBe(true);
  });

  it('permite el acceso si el rol del usuario está en la lista permitida', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['ADMINISTRADOR']),
    } as unknown as Reflector;

    expect(
      new RolesGuard(reflector, crearAuditoria()).canActivate(crearContexto('ADMINISTRADOR')),
    ).toBe(true);
  });

  it('rechaza y audita el acceso denegado (AC-026) si el rol no está en la lista permitida', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['ADMINISTRADOR']),
    } as unknown as Reflector;
    const auditoria = crearAuditoria();

    expect(() =>
      new RolesGuard(reflector, auditoria).canActivate(crearContexto('FISIOTERAPEUTA')),
    ).toThrow(ForbiddenException);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'acceso_denegado', resultado: 'DENEGADO' }),
    );
  });

  it('lee la metadata tanto del handler como de la clase (@Roles() vive en el controlador)', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(['ADMINISTRADOR']),
    } as unknown as Reflector;
    const contexto = crearContexto('ADMINISTRADOR');

    new RolesGuard(reflector, crearAuditoria()).canActivate(contexto);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(expect.any(String), [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
  });
});
