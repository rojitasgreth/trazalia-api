import { NotFoundException } from '@nestjs/common';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { ObtenerUsuarioCasoUso } from './obtener-usuario.caso-uso.js';

describe('ObtenerUsuarioCasoUso', () => {
  it('devuelve la vista administrada del usuario', async () => {
    const usuarios = {
      buscarPorId: vi.fn().mockResolvedValue({
        idUsuario: 'u1',
        nacionalidad: 'V',
        cedula: '1',
        nombre: 'A',
        apellido: 'B',
        correo: 'a@b.com',
        telefono: null,
        nombreUsuario: 'V1',
        rol: 'FISIOTERAPEUTA',
        estado: 'ACTIVO',
        fechaCreacion: new Date(),
        fechaActivacion: new Date(),
        ultimoAcceso: null,
        hashContrasena: 'no-debe-salir',
      }),
    } as unknown as UsuarioRepositorio;

    const resultado = await new ObtenerUsuarioCasoUso(usuarios).ejecutar('u1');

    expect(resultado.idUsuario).toBe('u1');
    expect(resultado).not.toHaveProperty('hashContrasena');
  });

  it('lanza NotFoundException si no existe', async () => {
    const usuarios = {
      buscarPorId: vi.fn().mockResolvedValue(null),
    } as unknown as UsuarioRepositorio;

    await expect(new ObtenerUsuarioCasoUso(usuarios).ejecutar('u1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
