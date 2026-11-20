import { SinRegistrosClinicos } from '../puertos/registros-clinicos.js';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { ActualizarHistoriaDto } from '../dto/actualizar-historia.dto.js';
import { centrosFalsos, datosCarlos, filaHistoria } from '../pruebas/fabricas.js';
import type { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';
import { ActualizarHistoriaCasoUso } from './actualizar-historia.caso-uso.js';
import { BuscarCoincidenciasCasoUso } from './buscar-coincidencias.caso-uso.js';

const NEURO = {
  idHistoria: 'h-neuro',
  tipo: 'NEURO_ADULTO' as const,
  estado: 'BORRADOR' as const,
  archivada: false,
  sinDocumento: false,
};
const ARCHIVADA = {
  ...NEURO,
  idHistoria: 'h-adulto-mayor',
  tipo: 'ADULTO_MAYOR' as const,
  archivada: true,
};

function crearCasoUso() {
  const historias = {
    buscarPorId: vi.fn().mockResolvedValue(filaHistoria()),
    buscarPorDocumento: vi.fn().mockResolvedValue([]),
    buscarPorNombreYNacimiento: vi.fn().mockResolvedValue([]),
    listarOtrasDelPaciente: vi.fn().mockResolvedValue([NEURO, ARCHIVADA]),
    actualizar: vi.fn().mockResolvedValue(filaHistoria()),
  } as unknown as HistoriaRepositorio;
  const auditoria = { registrar: vi.fn() } as unknown as AuditoriaServicio;
  const casoUso = new ActualizarHistoriaCasoUso(
    historias,
    new BuscarCoincidenciasCasoUso(historias),
    auditoria,
    new SinRegistrosClinicos(),
    centrosFalsos(),
  );
  return { casoUso, historias, auditoria };
}

function comando(cambios: Partial<ActualizarHistoriaDto> = {}): ActualizarHistoriaDto {
  const { fechaNacimiento, ...resto } = datosCarlos();
  return {
    ...resto,
    fechaNacimiento,
    fuenteInformacion: [],
    propagar: false,
    ...cambios,
  } as ActualizarHistoriaDto;
}

describe('ActualizarHistoriaCasoUso', () => {
  it('B16/RF-018: guarda solo en esta historia cuando no se pide propagar', async () => {
    const { casoUso, historias, auditoria } = crearCasoUso();

    await casoUso.ejecutar('f1', 'h1', comando({ telefono: '04245558890' }));

    expect(historias.actualizar).toHaveBeenCalledWith(
      'f1',
      'h1',
      expect.objectContaining({ telefono: '04245558890' }),
      null,
      [],
      null,
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoEvento: 'actualizacion_historia',
        metadatosMinimos: { idHistoria: 'h1', campos: ['telefono'], historiasPropagadas: [] },
      }),
    );
  });

  it('B17/RF-014: propaga a las demás historias no archivadas, nunca a las archivadas', async () => {
    const { casoUso, historias } = crearCasoUso();

    await casoUso.ejecutar('f1', 'h1', comando({ telefono: '04245558890', propagar: true }));

    expect(historias.actualizar).toHaveBeenCalledWith(
      'f1',
      'h1',
      expect.anything(),
      null,
      [{ idHistoria: 'h-neuro', cambios: { telefono: '04245558890' } }],
      null,
    );
  });

  it('propagar sin cambios compartidos no toca otras historias', async () => {
    const { casoUso, historias } = crearCasoUso();

    await casoUso.ejecutar('f1', 'h1', comando({ demandasFisicas: 'Nueva', propagar: true }));

    // Solo se consulta una vez, para el detalle de la respuesta.
    expect(historias.listarOtrasDelPaciente).toHaveBeenCalledTimes(1);
    expect(vi.mocked(historias.actualizar).mock.calls[0]![4]).toEqual([]);
  });

  it('AC-013: una historia ajena o inexistente responde 404', async () => {
    const { casoUso, historias } = crearCasoUso();
    vi.mocked(historias.buscarPorId).mockResolvedValue(null);

    await expect(casoUso.ejecutar('f2', 'h1', comando())).rejects.toThrow(NotFoundException);
  });

  it('una historia archivada es de solo lectura', async () => {
    const { casoUso, historias } = crearCasoUso();
    vi.mocked(historias.buscarPorId).mockResolvedValue(filaHistoria({ archivada: true }));

    await expect(casoUso.ejecutar('f1', 'h1', comando())).rejects.toThrow(ConflictException);
    expect(historias.actualizar).not.toHaveBeenCalled();
  });

  it('aplica las mismas reglas de identificación que al crear (RF-025)', async () => {
    const { casoUso } = crearCasoUso();

    await expect(casoUso.ejecutar('f1', 'h1', comando({ cedula: null }))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza un documento nuevo que pertenece a otro paciente', async () => {
    const { casoUso, historias } = crearCasoUso();
    vi.mocked(historias.buscarPorDocumento).mockResolvedValue([
      filaHistoria({ idHistoria: 'otra', idPaciente: 'p-otro' }),
    ]);

    await expect(casoUso.ejecutar('f1', 'h1', comando({ cedula: '999' }))).rejects.toThrow(
      ConflictException,
    );
  });

  it('acepta un documento nuevo que solo coincide con el mismo paciente', async () => {
    const { casoUso, historias } = crearCasoUso();
    vi.mocked(historias.buscarPorDocumento).mockResolvedValue([filaHistoria({ idPaciente: 'p1' })]);

    await casoUso.ejecutar('f1', 'h1', comando({ cedula: '999' }));

    expect(historias.actualizar).toHaveBeenCalled();
  });

  it('traduce un conflicto de unicidad en 409', async () => {
    const { casoUso, historias } = crearCasoUso();
    vi.mocked(historias.actualizar).mockRejectedValue(
      new PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: '7.10.1' }),
    );

    await expect(casoUso.ejecutar('f1', 'h1', comando())).rejects.toThrow(ConflictException);
  });

  it('B18: cualquier otro error se propaga sin auditar', async () => {
    const { casoUso, historias, auditoria } = crearCasoUso();
    vi.mocked(historias.actualizar).mockRejectedValue(new Error('caída'));

    await expect(casoUso.ejecutar('f1', 'h1', comando({ propagar: true }))).rejects.toThrow(
      'caída',
    );
    expect(auditoria.registrar).not.toHaveBeenCalled();
  });
});
