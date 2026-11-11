import { NotFoundException } from '@nestjs/common';
import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { ListarSesionesDeUsuarioCasoUso } from './listar-sesiones-de-usuario.caso-uso.js';

describe('ListarSesionesDeUsuarioCasoUso', () => {
  it('lista las sesiones activas de otro usuario', async () => {
    const usuarios = {
      buscarPorId: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
    } as unknown as UsuarioRepositorio;
    const sesiones = {
      listarActivasDeUsuario: vi.fn().mockResolvedValue([
        {
          idSesion: 's1',
          etiquetaDispositivo: 'Chrome',
          fechaCreacion: new Date(),
          ultimaActividad: new Date(),
        },
      ]),
    } as unknown as SesionRepositorio;

    const resultado = await new ListarSesionesDeUsuarioCasoUso(usuarios, sesiones).ejecutar('u1');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].idSesion).toBe('s1');
  });

  it('lanza NotFoundException si el usuario no existe', async () => {
    const usuarios = {
      buscarPorId: vi.fn().mockResolvedValue(null),
    } as unknown as UsuarioRepositorio;
    const sesiones = { listarActivasDeUsuario: vi.fn() } as unknown as SesionRepositorio;

    await expect(
      new ListarSesionesDeUsuarioCasoUso(usuarios, sesiones).ejecutar('u1'),
    ).rejects.toThrow(NotFoundException);
  });
});
