import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { ListarUsuariosCasoUso } from './listar-usuarios.caso-uso.js';

describe('ListarUsuariosCasoUso', () => {
  it('delega en el repositorio y expone la vista administrada paginada', async () => {
    const usuarios = {
      listar: vi.fn().mockResolvedValue({
        datos: [
          {
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
          },
        ],
        total: 1,
      }),
    } as unknown as UsuarioRepositorio;

    const casoUso = new ListarUsuariosCasoUso(usuarios);
    const resultado = await casoUso.ejecutar({ pagina: 1, porPagina: 20 });

    expect(resultado.total).toBe(1);
    expect(resultado.pagina).toBe(1);
    expect(resultado.datos[0]).not.toHaveProperty('hashContrasena');
    expect(resultado.datos[0].idUsuario).toBe('u1');
  });
});
