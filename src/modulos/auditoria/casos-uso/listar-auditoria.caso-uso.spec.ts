import type { AuditoriaRepositorio } from '../auditoria.repositorio.js';
import { ListarAuditoriaCasoUso } from './listar-auditoria.caso-uso.js';

describe('ListarAuditoriaCasoUso', () => {
  it('convierte las fechas ISO a Date antes de consultar el repositorio', async () => {
    const repositorio = {
      listar: vi.fn().mockResolvedValue({ datos: [], total: 0 }),
    } as unknown as AuditoriaRepositorio;

    await new ListarAuditoriaCasoUso(repositorio).ejecutar({
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
      listar: vi.fn().mockResolvedValue({ datos: [{ idEvento: 'e1' }], total: 42 }),
    } as unknown as AuditoriaRepositorio;

    const resultado = await new ListarAuditoriaCasoUso(repositorio).ejecutar({
      pagina: 3,
      porPagina: 10,
    });

    expect(resultado).toEqual({ datos: [{ idEvento: 'e1' }], total: 42, pagina: 3, porPagina: 10 });
  });
});
