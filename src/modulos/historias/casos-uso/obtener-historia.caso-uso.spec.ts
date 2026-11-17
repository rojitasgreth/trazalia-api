import { SinRegistrosClinicos } from '../puertos/registros-clinicos.js';
import { NotFoundException } from '@nestjs/common';
import { centrosFalsos, filaHistoria } from '../pruebas/fabricas.js';
import type { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';
import { ObtenerHistoriaCasoUso } from './obtener-historia.caso-uso.js';

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

describe('ObtenerHistoriaCasoUso', () => {
  it('devuelve el detalle con completitud y las otras historias del paciente', async () => {
    const historias = crearRepositorio();
    const casoUso = new ObtenerHistoriaCasoUso(
      historias,
      new SinRegistrosClinicos(),
      centrosFalsos(),
    );

    const detalle = await casoUso.ejecutar('f1', 'h1');

    expect(historias.buscarPorId).toHaveBeenCalledWith('f1', 'h1');
    expect(historias.listarOtrasDelPaciente).toHaveBeenCalledWith('f1', 'p1', 'h1');
    expect(detalle).toMatchObject({
      camposFaltantes: [],
      puedeIniciarValoracion: true,
      representante: null,
      otrasHistorias: [{ idHistoria: 'h2' }],
    });
    expect(detalle.datos.fechaNacimiento).toBe('1985-03-14');
  });

  it('incluye el representante de una historia infantil', async () => {
    const historias = crearRepositorio();
    vi.mocked(historias.buscarPorId).mockResolvedValue(
      filaHistoria({
        tipo: 'REHAB_INFANTIL',
        representante: {
          idHistoria: 'h1',
          parentesco: 'MADRE',
          nombre: 'Laura',
          apellido: 'Martínez',
          cedula: null,
          fechaNacimiento: new Date('1991-07-30T00:00:00.000Z'),
          estadoCivil: null,
          gradoInstruccion: null,
          ocupacion: null,
        },
      }),
    );

    const detalle = await new ObtenerHistoriaCasoUso(
      historias,
      new SinRegistrosClinicos(),
      centrosFalsos(),
    ).ejecutar('f1', 'h1');

    expect(detalle.representante).toMatchObject({ nombre: 'Laura', fechaNacimiento: '1991-07-30' });
    expect(detalle.camposFaltantes).toContain('representante.cedula');
  });

  it('AC-013: una historia ajena o inexistente responde 404', async () => {
    const historias = crearRepositorio();
    vi.mocked(historias.buscarPorId).mockResolvedValue(null);

    await expect(
      new ObtenerHistoriaCasoUso(historias, new SinRegistrosClinicos(), centrosFalsos()).ejecutar(
        'f2',
        'h1',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
