import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { ReactivarUsuarioCasoUso } from './reactivar-usuario.caso-uso.js';

function crearCasoUso(usuario: Record<string, unknown> | null) {
  const usuarios = {
    buscarPorId: vi.fn().mockResolvedValue(usuario),
    actualizarEstado: vi.fn().mockResolvedValue(undefined),
  } as unknown as UsuarioRepositorio;
  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;

  return { casoUso: new ReactivarUsuarioCasoUso(usuarios, auditoria), usuarios, auditoria };
}

describe('ReactivarUsuarioCasoUso', () => {
  it('reactiva una SUSPENDIDA que ya había sido activada', async () => {
    const { casoUso, usuarios, auditoria } = crearCasoUso({
      idUsuario: 'u1',
      estado: 'SUSPENDIDO',
      fechaActivacion: new Date(),
    });

    await casoUso.ejecutar('admin-1', 'u1');

    expect(usuarios.actualizarEstado).toHaveBeenCalledWith('u1', 'ACTIVO');
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'reactivacion' }),
    );
  });

  it('rechaza reactivar una SUSPENDIDA que nunca se activó (debe usar reenviar-invitación)', async () => {
    const { casoUso } = crearCasoUso({
      idUsuario: 'u1',
      estado: 'SUSPENDIDO',
      fechaActivacion: null,
    });

    await expect(casoUso.ejecutar('admin-1', 'u1')).rejects.toThrow(BadRequestException);
  });

  it('rechaza reactivar una cuenta que no está suspendida', async () => {
    const { casoUso } = crearCasoUso({
      idUsuario: 'u1',
      estado: 'ACTIVO',
      fechaActivacion: new Date(),
    });

    await expect(casoUso.ejecutar('admin-1', 'u1')).rejects.toThrow(BadRequestException);
  });

  it('lanza NotFoundException si el usuario no existe', async () => {
    const { casoUso } = crearCasoUso(null);

    await expect(casoUso.ejecutar('admin-1', 'u1')).rejects.toThrow(NotFoundException);
  });
});
