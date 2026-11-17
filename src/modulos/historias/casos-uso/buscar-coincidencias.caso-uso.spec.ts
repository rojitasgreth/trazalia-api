import { filaHistoria } from '../pruebas/fabricas.js';
import type { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';
import { BuscarCoincidenciasCasoUso } from './buscar-coincidencias.caso-uso.js';

function crearCasoUso() {
  const historias = {
    buscarPorDocumento: vi.fn().mockResolvedValue([]),
    buscarPorNombreYNacimiento: vi.fn().mockResolvedValue([]),
  } as unknown as HistoriaRepositorio;
  return { casoUso: new BuscarCoincidenciasCasoUso(historias), historias };
}

describe('BuscarCoincidenciasCasoUso', () => {
  it('sin coincidencias responde "ninguna"', async () => {
    const { casoUso, historias } = crearCasoUso();

    await expect(
      casoUso.ejecutar('f1', { tipo: 'NEURO_ADULTO', nacionalidad: 'V', cedula: '15.482.301' }),
    ).resolves.toEqual({ resultado: 'ninguna' });
    expect(historias.buscarPorDocumento).toHaveBeenCalledWith('f1', 'V', '15482301');
  });

  it('B13/RF-010: una historia del mismo tipo es un duplicado', async () => {
    const { casoUso, historias } = crearCasoUso();
    vi.mocked(historias.buscarPorDocumento).mockResolvedValue([
      filaHistoria({ idHistoria: 'neuro', tipo: 'NEURO_ADULTO' }),
      filaHistoria({ idHistoria: 'trauma', tipo: 'TRAUMA_ADULTO' }),
    ]);

    const resultado = await casoUso.ejecutar('f1', {
      tipo: 'TRAUMA_ADULTO',
      nacionalidad: 'V',
      cedula: '15482301',
    });

    expect(resultado).toMatchObject({ resultado: 'duplicado', historia: { idHistoria: 'trauma' } });
  });

  it('B14/RF-012: otra historia ofrece sus datos personales, sin los propios de su tipo', async () => {
    const { casoUso, historias } = crearCasoUso();
    vi.mocked(historias.buscarPorDocumento).mockResolvedValue([
      filaHistoria({ idHistoria: 'trauma', tipo: 'TRAUMA_ADULTO' }),
    ]);

    const resultado = await casoUso.ejecutar('f1', {
      tipo: 'NEURO_ADULTO',
      nacionalidad: 'V',
      cedula: '15482301',
    });

    expect(resultado).toMatchObject({
      resultado: 'autocompletar',
      historia: { idHistoria: 'trauma', tipo: 'TRAUMA_ADULTO' },
      datos: { nombre: 'Carlos', telefono: '0412-555-0134', demandasFisicas: null },
    });
  });

  it('infantil sin documento busca por nombre, apellido y nacimiento', async () => {
    const { casoUso, historias } = crearCasoUso();

    await casoUso.ejecutar('f1', {
      tipo: 'REHAB_INFANTIL',
      sinDocumento: true,
      nombre: ' Sofía ',
      apellido: 'Martínez',
      fechaNacimiento: '2022-06-10',
    });

    expect(historias.buscarPorNombreYNacimiento).toHaveBeenCalledWith(
      'f1',
      'Sofía',
      'Martínez',
      '2022-06-10',
    );
  });

  it('con datos insuficientes no consulta nada', async () => {
    const { casoUso, historias } = crearCasoUso();

    await casoUso.ejecutar('f1', { tipo: 'NEURO_ADULTO', cedula: '15482301' });
    await casoUso.ejecutar('f1', { tipo: 'REHAB_INFANTIL', sinDocumento: true, nombre: 'Sofía' });
    // "Sin documento" no existe en adultos: se ignora.
    await casoUso.ejecutar('f1', {
      tipo: 'NEURO_ADULTO',
      sinDocumento: true,
      nombre: 'A',
      apellido: 'B',
      fechaNacimiento: '2000-01-01',
    });

    expect(historias.buscarPorDocumento).not.toHaveBeenCalled();
    expect(historias.buscarPorNombreYNacimiento).not.toHaveBeenCalled();
  });
});
