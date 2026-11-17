import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { filaHistoria } from '../pruebas/fabricas.js';
import type { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';
import { CrearHistoriaCasoUso, type CrearHistoriaComando } from './crear-historia.caso-uso.js';

function crearCasoUso() {
  const historias = {
    buscarPorDocumento: vi.fn().mockResolvedValue([]),
    buscarPorNombreYNacimiento: vi.fn().mockResolvedValue([]),
    crear: vi.fn().mockResolvedValue(filaHistoria({ idHistoria: 'nueva', idPaciente: 'p-nuevo' })),
    listarOtrasDelPaciente: vi.fn().mockResolvedValue([]),
  } as unknown as HistoriaRepositorio;
  const auditoria = { registrar: vi.fn() } as unknown as AuditoriaServicio;
  return { casoUso: new CrearHistoriaCasoUso(historias, auditoria), historias, auditoria };
}

const COMANDO: CrearHistoriaComando = {
  tipo: 'TRAUMA_ADULTO',
  nombre: 'Carlos',
  apellido: 'Andrade',
  nacionalidad: 'V',
  cedula: '15.482.301',
};

function errorUnicidad() {
  return new PrismaClientKnownRequestError('Unique constraint', {
    code: 'P2002',
    clientVersion: '7.10.1',
  });
}

describe('CrearHistoriaCasoUso', () => {
  it('RF-006: crea la historia en Borrador con un paciente nuevo y la audita', async () => {
    const { casoUso, historias, auditoria } = crearCasoUso();

    const historia = await casoUso.ejecutar('f1', COMANDO);

    expect(historias.buscarPorDocumento).toHaveBeenCalledWith('f1', 'V', '15482301');
    expect(historias.crear).toHaveBeenCalledWith(
      'f1',
      null,
      'TRAUMA_ADULTO',
      expect.objectContaining({ nombre: 'Carlos', cedula: '15482301' }),
      null,
    );
    expect(historia.idHistoria).toBe('nueva');
    expect(auditoria.registrar).toHaveBeenCalledWith({
      idUsuarioActor: 'f1',
      tipoEvento: 'creacion_historia',
      resultado: 'EXITOSO',
      metadatosMinimos: { idHistoria: 'nueva', tipo: 'TRAUMA_ADULTO' },
    });
  });

  it('AC-004: rechaza un adulto sin cédula con los mensajes del prototipo', async () => {
    const { casoUso, historias } = crearCasoUso();

    const intento = casoUso.ejecutar('f1', { ...COMANDO, cedula: null });

    await expect(intento).rejects.toThrow(BadRequestException);
    await intento.catch((error: BadRequestException) => {
      expect(error.getResponse()).toMatchObject({
        errores: [expect.objectContaining({ campo: 'documento' })],
      });
    });
    expect(historias.crear).not.toHaveBeenCalled();
  });

  it('RF-010/AC-006: bloquea un duplicado del mismo tipo y devuelve la historia existente', async () => {
    const { casoUso, historias } = crearCasoUso();
    vi.mocked(historias.buscarPorDocumento).mockResolvedValue([
      filaHistoria({ idHistoria: 'existente', tipo: 'TRAUMA_ADULTO' }),
    ]);

    const intento = casoUso.ejecutar('f1', COMANDO);

    await expect(intento).rejects.toThrow(ConflictException);
    await intento.catch((error: ConflictException) => {
      expect(error.getResponse()).toMatchObject({ idHistoriaExistente: 'existente' });
    });
    expect(historias.crear).not.toHaveBeenCalled();
  });

  it('RF-011: con otro tipo del mismo documento, enlaza al mismo paciente', async () => {
    const { casoUso, historias } = crearCasoUso();
    vi.mocked(historias.buscarPorDocumento).mockResolvedValue([
      filaHistoria({ idHistoria: 'neuro', idPaciente: 'p-carlos', tipo: 'NEURO_ADULTO' }),
    ]);

    await casoUso.ejecutar('f1', COMANDO);

    expect(historias.crear).toHaveBeenCalledWith(
      'f1',
      'p-carlos',
      'TRAUMA_ADULTO',
      expect.anything(),
      null,
    );
  });

  it('RF-009: infantil sin documento busca coincidencias por nombre, apellido y nacimiento', async () => {
    const { casoUso, historias } = crearCasoUso();

    await casoUso.ejecutar('f1', {
      tipo: 'REHAB_INFANTIL',
      nombre: 'Sofía',
      apellido: 'Martínez',
      sinDocumento: true,
      fechaNacimiento: '2022-06-10',
    });

    expect(historias.buscarPorNombreYNacimiento).toHaveBeenCalledWith(
      'f1',
      'Sofía',
      'Martínez',
      '2022-06-10',
    );
    expect(historias.buscarPorDocumento).not.toHaveBeenCalled();
  });

  it('infantil sin cédula ni "Sin documento" no busca coincidencias', async () => {
    const { casoUso, historias } = crearCasoUso();

    await casoUso.ejecutar('f1', { tipo: 'REHAB_INFANTIL', nombre: 'Sofía', apellido: 'Martínez' });

    expect(historias.buscarPorDocumento).not.toHaveBeenCalled();
    expect(historias.buscarPorNombreYNacimiento).not.toHaveBeenCalled();
  });

  it('§18 concurrencia: si el índice único salta, responde 409 con la historia ganadora', async () => {
    const { casoUso, historias } = crearCasoUso();
    vi.mocked(historias.crear).mockRejectedValue(errorUnicidad());
    vi.mocked(historias.buscarPorDocumento)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([filaHistoria({ idHistoria: 'ganadora' })]);

    const intento = casoUso.ejecutar('f1', COMANDO);

    await expect(intento).rejects.toThrow(ConflictException);
    await intento.catch((error: ConflictException) => {
      expect(error.getResponse()).toMatchObject({ idHistoriaExistente: 'ganadora' });
    });
  });

  it('conflicto de unicidad sin historia localizable: 409 genérico', async () => {
    const { casoUso, historias } = crearCasoUso();
    vi.mocked(historias.crear).mockRejectedValue(errorUnicidad());

    await expect(casoUso.ejecutar('f1', COMANDO)).rejects.toThrow(ConflictException);
  });

  it('propaga cualquier otro error del repositorio', async () => {
    const { casoUso, historias } = crearCasoUso();
    vi.mocked(historias.crear).mockRejectedValue(new Error('caída'));

    await expect(casoUso.ejecutar('f1', COMANDO)).rejects.toThrow('caída');
  });

  it('AC-011/RF-027: crea una historia infantil con su representante normalizado', async () => {
    const { casoUso, historias } = crearCasoUso();

    await casoUso.ejecutar('f1', {
      tipo: 'REHAB_INFANTIL',
      nombre: 'Sofía',
      apellido: 'Martínez',
      sinDocumento: true,
      fechaNacimiento: '2022-06-10',
      representante: { parentesco: 'MADRE', nombre: ' Laura ', cedula: '18.220.417' },
    });

    expect(historias.crear).toHaveBeenCalledWith(
      'f1',
      null,
      'REHAB_INFANTIL',
      expect.objectContaining({ sinDocumento: true }),
      expect.objectContaining({ parentesco: 'MADRE', nombre: 'Laura', cedula: '18220417' }),
    );
  });

  it('ignora el representante en los tipos de adulto', async () => {
    const { casoUso, historias } = crearCasoUso();

    await casoUso.ejecutar('f1', { ...COMANDO, representante: { nombre: 'Laura' } });

    expect(vi.mocked(historias.crear).mock.calls[0]![4]).toBeNull();
  });

  it('rechaza una cédula de representante con formato inválido', async () => {
    const { casoUso } = crearCasoUso();

    const intento = casoUso.ejecutar('f1', {
      tipo: 'REHAB_INFANTIL',
      nombre: 'Sofía',
      apellido: 'Martínez',
      representante: { cedula: '1234567890' },
    });

    await expect(intento).rejects.toThrow(BadRequestException);
  });
});
