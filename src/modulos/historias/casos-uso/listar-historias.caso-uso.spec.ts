import { filaHistoria } from '../pruebas/fabricas.js';
import type { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';
import { ListarHistoriasCasoUso } from './listar-historias.caso-uso.js';

function crearRepositorio() {
  return {
    listar: vi.fn().mockResolvedValue({ datos: [filaHistoria()], total: 1 }),
    contar: vi.fn().mockResolvedValue({ historias: 8, archivadas: 2 }),
    buscarPorId: vi.fn().mockResolvedValue(filaHistoria()),
    listarOtrasDelPaciente: vi
      .fn()
      .mockResolvedValue([
        { idHistoria: 'h2', tipo: 'NEURO_ADULTO', estado: 'BORRADOR', archivada: false },
      ]),
  } as unknown as HistoriaRepositorio;
}

describe('ListarHistoriasCasoUso', () => {
  it('RF-022/RF-023: lista las historias del propietario con conteos por pestaña', async () => {
    const historias = crearRepositorio();
    const casoUso = new ListarHistoriasCasoUso(historias);

    const pagina = await casoUso.ejecutar('f1', {
      archivadas: 'true',
      tipo: 'TRAUMA_ADULTO',
      pagina: 1,
      porPagina: 20,
    });

    expect(historias.listar).toHaveBeenCalledWith(
      'f1',
      expect.objectContaining({ archivadas: true, tipo: 'TRAUMA_ADULTO' }),
    );
    expect(pagina).toMatchObject({
      total: 1,
      pagina: 1,
      porPagina: 20,
      conteos: { historias: 8, archivadas: 2 },
    });
    expect(pagina.datos[0]).toMatchObject({
      idHistoria: 'h1',
      fechaNacimiento: '1985-03-14',
      fechaActualizacion: '2026-11-16T12:00:00.000Z',
    });
  });
});
