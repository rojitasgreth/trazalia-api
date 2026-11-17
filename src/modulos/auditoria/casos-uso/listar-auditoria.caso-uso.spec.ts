import type { UsuarioRepositorio } from '../../acceso/repositorios/usuario.repositorio.js';
import type { AuditoriaRepositorio } from '../auditoria.repositorio.js';
import { ListarAuditoriaCasoUso } from './listar-auditoria.caso-uso.js';

function crearUsuarios(nombres: Record<string, string> = {}) {
  return {
    buscarNombresPorIds: vi.fn().mockResolvedValue(new Map(Object.entries(nombres))),
  } as unknown as UsuarioRepositorio;
}

describe('ListarAuditoriaCasoUso', () => {
  it('convierte las fechas ISO a Date antes de consultar el repositorio', async () => {
    const repositorio = {
      listar: vi.fn().mockResolvedValue({ datos: [], total: 0 }),
    } as unknown as AuditoriaRepositorio;

    await new ListarAuditoriaCasoUso(repositorio, crearUsuarios()).ejecutar({
      desde: '2026-01-01T00:00:00Z',
      hasta: '2026-01-31T00:00:00Z',
      pagina: 1,
      porPagina: 20,
    });

    expect(repositorio.listar).toHaveBeenCalledWith(
      expect.objectContaining({
        desde: new Date('2026-01-01T00:00:00Z'),
        hasta: new Date('2026-01-31T00:00:00Z'),
      }),
    );
  });

  it('expone pagina/porPagina junto a los datos y el total', async () => {
    const repositorio = {
      listar: vi.fn().mockResolvedValue({
        datos: [{ idEvento: 'e1', idUsuarioActor: null, idUsuarioAfectado: null }],
        total: 42,
      }),
    } as unknown as AuditoriaRepositorio;

    const resultado = await new ListarAuditoriaCasoUso(repositorio, crearUsuarios()).ejecutar({
      pagina: 3,
      porPagina: 10,
    });

    expect(resultado).toEqual({
      datos: [
        {
          idEvento: 'e1',
          idUsuarioActor: null,
          idUsuarioAfectado: null,
          nombreActor: null,
          nombreAfectado: null,
        },
      ],
      total: 42,
      pagina: 3,
      porPagina: 10,
    });
  });

  it('resuelve el nombre actual del actor y del usuario afectado por id', async () => {
    const repositorio = {
      listar: vi.fn().mockResolvedValue({
        datos: [{ idEvento: 'e1', idUsuarioActor: 'u1', idUsuarioAfectado: 'u2' }],
        total: 1,
      }),
    } as unknown as AuditoriaRepositorio;
    const usuarios = crearUsuarios({ u1: 'Ana Pérez', u2: 'Beto Gómez' });

    const resultado = await new ListarAuditoriaCasoUso(repositorio, usuarios).ejecutar({
      pagina: 1,
      porPagina: 20,
    });

    expect(usuarios.buscarNombresPorIds).toHaveBeenCalledWith(['u1', 'u2']);
    expect(resultado.datos[0]).toMatchObject({
      nombreActor: 'Ana Pérez',
      nombreAfectado: 'Beto Gómez',
    });
  });

  it('deja el nombre en null cuando el id no se encuentra', async () => {
    const repositorio = {
      listar: vi.fn().mockResolvedValue({
        datos: [{ idEvento: 'e1', idUsuarioActor: 'inexistente', idUsuarioAfectado: null }],
        total: 1,
      }),
    } as unknown as AuditoriaRepositorio;

    const resultado = await new ListarAuditoriaCasoUso(repositorio, crearUsuarios()).ejecutar({
      pagina: 1,
      porPagina: 20,
    });

    expect(resultado.datos[0]).toMatchObject({ nombreActor: null, nombreAfectado: null });
  });
});
