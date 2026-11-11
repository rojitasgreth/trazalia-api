import { ForbiddenException } from '@nestjs/common';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { AdminCerrarSesionCasoUso } from './admin-cerrar-sesion.caso-uso.js';

describe('AdminCerrarSesionCasoUso', () => {
  it('revoca una sesión concreta de otro usuario y audita', async () => {
    const sesiones = {
      buscarPorId: vi.fn().mockResolvedValue({ idSesion: 's1', idUsuario: 'u1' }),
      revocar: vi.fn().mockResolvedValue(undefined),
    } as unknown as SesionRepositorio;
    const auditoria = {
      registrar: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuditoriaServicio;

    await new AdminCerrarSesionCasoUso(sesiones, auditoria).ejecutar('admin-1', 'u1', 's1');

    expect(sesiones.revocar).toHaveBeenCalledWith('s1', 'cierre_administrativo');
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoEvento: 'cierre_sesion_administrativo',
        idUsuarioActor: 'admin-1',
      }),
    );
  });

  it('rechaza si la sesión no existe', async () => {
    const sesiones = {
      buscarPorId: vi.fn().mockResolvedValue(null),
      revocar: vi.fn(),
    } as unknown as SesionRepositorio;
    const auditoria = { registrar: vi.fn() } as unknown as AuditoriaServicio;

    await expect(
      new AdminCerrarSesionCasoUso(sesiones, auditoria).ejecutar('admin-1', 'u1', 's1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza si la sesión pertenece a otro usuario (no se puede cerrar por adivinanza de id)', async () => {
    const sesiones = {
      buscarPorId: vi.fn().mockResolvedValue({ idSesion: 's1', idUsuario: 'otro' }),
      revocar: vi.fn(),
    } as unknown as SesionRepositorio;
    const auditoria = { registrar: vi.fn() } as unknown as AuditoriaServicio;

    await expect(
      new AdminCerrarSesionCasoUso(sesiones, auditoria).ejecutar('admin-1', 'u1', 's1'),
    ).rejects.toThrow(ForbiddenException);
  });
});
