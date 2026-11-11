import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { DesbloquearUsuarioCasoUso } from './desbloquear-usuario.caso-uso.js';

function crearCasoUso(usuario: Record<string, unknown> | null) {
  const usuarios = {
    buscarPorId: vi.fn().mockResolvedValue(usuario),
    desbloquear: vi.fn().mockResolvedValue(undefined),
  } as unknown as UsuarioRepositorio;
  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;

  return { casoUso: new DesbloquearUsuarioCasoUso(usuarios, auditoria), usuarios, auditoria };
}

describe('DesbloquearUsuarioCasoUso', () => {
  it('levanta el bloqueo y audita el desbloqueo administrativo', async () => {
    const { casoUso, usuarios, auditoria } = crearCasoUso({ idUsuario: 'u1', estado: 'BLOQUEADO' });

    await casoUso.ejecutar('admin-1', 'u1');

    expect(usuarios.desbloquear).toHaveBeenCalledWith('u1');
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'desbloqueo', idUsuarioActor: 'admin-1' }),
    );
  });

  it('rechaza si la cuenta no está bloqueada', async () => {
    const { casoUso } = crearCasoUso({ idUsuario: 'u1', estado: 'ACTIVO' });

    await expect(casoUso.ejecutar('admin-1', 'u1')).rejects.toThrow(BadRequestException);
  });

  it('lanza NotFoundException si el usuario no existe', async () => {
    const { casoUso } = crearCasoUso(null);

    await expect(casoUso.ejecutar('admin-1', 'u1')).rejects.toThrow(NotFoundException);
  });
});
