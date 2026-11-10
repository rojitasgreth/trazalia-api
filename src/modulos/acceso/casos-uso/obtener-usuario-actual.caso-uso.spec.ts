import { UnauthorizedException } from '@nestjs/common';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { ObtenerUsuarioActualCasoUso } from './obtener-usuario-actual.caso-uso.js';

describe('ObtenerUsuarioActualCasoUso', () => {
  it('devuelve el perfil público del usuario', async () => {
    const usuarios = {
      buscarPorId: vi.fn().mockResolvedValue({
        idUsuario: 'u1',
        correo: 'a@b.com',
        nombreUsuario: 'V1',
        nombre: 'Ana',
        apellido: 'Pérez',
        rol: 'FISIOTERAPEUTA',
        hashContrasena: 'no-debe-salir',
      }),
    } as unknown as UsuarioRepositorio;
    const casoUso = new ObtenerUsuarioActualCasoUso(usuarios);

    const resultado = await casoUso.ejecutar('u1');

    expect(resultado).toEqual({
      idUsuario: 'u1',
      correo: 'a@b.com',
      nombreUsuario: 'V1',
      nombre: 'Ana',
      apellido: 'Pérez',
      rol: 'FISIOTERAPEUTA',
    });
  });

  it('rechaza si el usuario ya no existe', async () => {
    const usuarios = {
      buscarPorId: vi.fn().mockResolvedValue(null),
    } as unknown as UsuarioRepositorio;
    const casoUso = new ObtenerUsuarioActualCasoUso(usuarios);

    await expect(casoUso.ejecutar('u1')).rejects.toThrow(UnauthorizedException);
  });
});
