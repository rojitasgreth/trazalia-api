import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { SuspenderUsuarioCasoUso } from './suspender-usuario.caso-uso.js';

function crearCasoUso(usuario: Record<string, unknown> | null, ok = true) {
  const usuarios = {
    buscarPorId: vi.fn().mockResolvedValue(usuario),
    cambiarEstadoProtegido: vi.fn().mockResolvedValue({ ok }),
  } as unknown as UsuarioRepositorio;
  const sesiones = {
    revocarTodasDeUsuario: vi.fn().mockResolvedValue(undefined),
  } as unknown as SesionRepositorio;
  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;

  return {
    casoUso: new SuspenderUsuarioCasoUso(usuarios, sesiones, auditoria),
    usuarios,
    sesiones,
    auditoria,
  };
}

describe('SuspenderUsuarioCasoUso', () => {
  it('suspende una cuenta activa y revoca sus sesiones (BR-017/BR-030)', async () => {
    const { casoUso, usuarios, sesiones, auditoria } = crearCasoUso({
      idUsuario: 'u1',
      estado: 'ACTIVO',
    });

    await casoUso.ejecutar('admin-1', 'u1');

    expect(usuarios.cambiarEstadoProtegido).toHaveBeenCalledWith('u1', 'SUSPENDIDO');
    expect(sesiones.revocarTodasDeUsuario).toHaveBeenCalledWith('u1', 'suspension');
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'suspension' }),
    );
  });

  it('rechaza que un administrador se suspenda a sí mismo (BR-033)', async () => {
    const { casoUso } = crearCasoUso({ idUsuario: 'admin-1', estado: 'ACTIVO' });

    await expect(casoUso.ejecutar('admin-1', 'admin-1')).rejects.toThrow(ForbiddenException);
  });

  it('rechaza suspender una cuenta que no está activa', async () => {
    const { casoUso } = crearCasoUso({ idUsuario: 'u1', estado: 'PENDIENTE' });

    await expect(casoUso.ejecutar('admin-1', 'u1')).rejects.toThrow(BadRequestException);
  });

  it('rechaza si dejaría al sistema sin administradores activos (BR-033)', async () => {
    const { casoUso } = crearCasoUso({ idUsuario: 'u1', estado: 'ACTIVO' }, false);

    await expect(casoUso.ejecutar('admin-1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('lanza NotFoundException si el usuario no existe', async () => {
    const { casoUso } = crearCasoUso(null);

    await expect(casoUso.ejecutar('admin-1', 'u1')).rejects.toThrow(NotFoundException);
  });
});
