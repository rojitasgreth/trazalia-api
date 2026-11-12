import type { ListarAuditoriaCasoUso } from './casos-uso/listar-auditoria.caso-uso.js';
import { AuditoriaController } from './auditoria.controller.js';

describe('AuditoriaController', () => {
  it('getEventos delega en ListarAuditoriaCasoUso con los filtros de query', async () => {
    const listarAuditoria = {
      ejecutar: vi.fn().mockResolvedValue({ datos: [], total: 0, pagina: 1, porPagina: 20 }),
    } as unknown as ListarAuditoriaCasoUso;
    const controlador = new AuditoriaController(listarAuditoria);

    const resultado = await controlador.getEventos({ pagina: 1, porPagina: 20 });

    expect(listarAuditoria.ejecutar).toHaveBeenCalledWith({ pagina: 1, porPagina: 20 });
    expect(resultado).toEqual({ datos: [], total: 0, pagina: 1, porPagina: 20 });
  });
});
