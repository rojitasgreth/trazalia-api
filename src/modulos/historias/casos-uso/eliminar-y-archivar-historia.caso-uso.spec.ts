import { ConflictException, NotFoundException } from '@nestjs/common';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { filaHistoria } from '../pruebas/fabricas.js';
import type { RegistrosClinicos } from '../puertos/registros-clinicos.js';
import type { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';
import { ArchivarHistoriaCasoUso } from './archivar-historia.caso-uso.js';
import { DesarchivarHistoriaCasoUso } from './desarchivar-historia.caso-uso.js';
import { EliminarHistoriaCasoUso } from './eliminar-historia.caso-uso.js';
import { MarcarHistoriaActivaCasoUso } from './marcar-historia-activa.caso-uso.js';

// Doble del puerto (ADR-0003): permite probar las reglas que dependen de
// registros clínicos aunque en esta fase no exista ninguno.
function registros(tiene: boolean): RegistrosClinicos {
  return { tieneRegistros: vi.fn().mockResolvedValue(tiene) };
}

function dependencias() {
  const historias = {
    buscarPorId: vi.fn().mockResolvedValue(filaHistoria()),
    eliminar: vi.fn(async (_f: string, _h: unknown, auditar: (tx: unknown) => Promise<void>) =>
      auditar('tx'),
    ),
    cambiarArchivo: vi.fn(async (_f: string, _id: string, archivada: boolean) =>
      filaHistoria({ archivada, fechaArchivo: archivada ? new Date() : null }),
    ),
    marcarActiva: vi.fn().mockResolvedValue(undefined),
    listarOtrasDelPaciente: vi.fn().mockResolvedValue([]),
  } as unknown as HistoriaRepositorio;
  const auditoria = {
    registrar: vi.fn(),
    registrarEnTransaccion: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;
  return { historias, auditoria };
}

describe('EliminarHistoriaCasoUso (SPEC §13)', () => {
  it('AC-015/RF-021: sin registros elimina y audita solo id, actor y fecha en la transacción', async () => {
    const { historias, auditoria } = dependencias();

    await new EliminarHistoriaCasoUso(historias, registros(false), auditoria).ejecutar('f1', 'h1');

    expect(historias.eliminar).toHaveBeenCalledWith(
      'f1',
      expect.objectContaining({ idHistoria: 'h1', idPaciente: 'p1' }),
      expect.any(Function),
    );
    expect(auditoria.registrarEnTransaccion).toHaveBeenCalledWith('tx', {
      idUsuarioActor: 'f1',
      tipoEvento: 'eliminacion_historia',
      resultado: 'EXITOSO',
      metadatosMinimos: { idHistoria: 'h1' },
    });
  });

  it('AC-014/RF-019: con registros clínicos se bloquea y se ofrece archivar', async () => {
    const { historias, auditoria } = dependencias();

    const intento = new EliminarHistoriaCasoUso(historias, registros(true), auditoria).ejecutar(
      'f1',
      'h1',
    );

    await expect(intento).rejects.toThrow(ConflictException);
    await intento.catch((error: ConflictException) =>
      expect(error.getResponse()).toMatchObject({ motivo: 'registros_clinicos' }),
    );
    expect(historias.eliminar).not.toHaveBeenCalled();
  });

  it('una historia archivada tampoco se elimina', async () => {
    const { historias, auditoria } = dependencias();
    vi.mocked(historias.buscarPorId).mockResolvedValue(filaHistoria({ archivada: true }));

    await expect(
      new EliminarHistoriaCasoUso(historias, registros(false), auditoria).ejecutar('f1', 'h1'),
    ).rejects.toThrow(ConflictException);
  });

  it('AC-013: una historia ajena responde 404', async () => {
    const { historias, auditoria } = dependencias();
    vi.mocked(historias.buscarPorId).mockResolvedValue(null);

    await expect(
      new EliminarHistoriaCasoUso(historias, registros(false), auditoria).ejecutar('f2', 'h1'),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('ArchivarHistoriaCasoUso / DesarchivarHistoriaCasoUso (SPEC §11)', () => {
  it('AC-014: archiva una historia con registros y la deja de solo lectura', async () => {
    const { historias, auditoria } = dependencias();

    const detalle = await new ArchivarHistoriaCasoUso(
      historias,
      registros(true),
      auditoria,
    ).ejecutar('f1', 'h1');

    expect(historias.cambiarArchivo).toHaveBeenCalledWith('f1', 'h1', true);
    expect(detalle).toMatchObject({ archivada: true, tieneRegistrosClinicos: true });
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'archivo_historia' }),
    );
  });

  it('no archiva una historia sin registros (se puede eliminar) ni una ya archivada', async () => {
    const { historias, auditoria } = dependencias();
    const casoUso = new ArchivarHistoriaCasoUso(historias, registros(false), auditoria);

    await expect(casoUso.ejecutar('f1', 'h1')).rejects.toThrow(ConflictException);
    vi.mocked(historias.buscarPorId).mockResolvedValue(filaHistoria({ archivada: true }));
    await expect(
      new ArchivarHistoriaCasoUso(historias, registros(true), auditoria).ejecutar('f1', 'h1'),
    ).rejects.toThrow(ConflictException);
    expect(historias.cambiarArchivo).not.toHaveBeenCalled();
  });

  it('desarchiva una historia archivada', async () => {
    const { historias, auditoria } = dependencias();
    vi.mocked(historias.buscarPorId).mockResolvedValue(filaHistoria({ archivada: true }));

    const detalle = await new DesarchivarHistoriaCasoUso(
      historias,
      registros(true),
      auditoria,
    ).ejecutar('f1', 'h1');

    expect(historias.cambiarArchivo).toHaveBeenCalledWith('f1', 'h1', false);
    expect(detalle.archivada).toBe(false);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'desarchivo_historia' }),
    );
  });

  it('no desarchiva una historia que no está archivada; 404 si es ajena', async () => {
    const { historias, auditoria } = dependencias();
    const casoUso = new DesarchivarHistoriaCasoUso(historias, registros(true), auditoria);

    await expect(casoUso.ejecutar('f1', 'h1')).rejects.toThrow(ConflictException);
    vi.mocked(historias.buscarPorId).mockResolvedValue(null);
    await expect(casoUso.ejecutar('f2', 'h1')).rejects.toThrow(NotFoundException);
    await expect(
      new ArchivarHistoriaCasoUso(historias, registros(true), auditoria).ejecutar('f2', 'h1'),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('MarcarHistoriaActivaCasoUso (RF-017/AC-012)', () => {
  it('pasa de Borrador a Activa con los datos completos', async () => {
    const { historias, auditoria } = dependencias();

    await new MarcarHistoriaActivaCasoUso(historias, auditoria).ejecutar('f1', 'h1');

    expect(historias.marcarActiva).toHaveBeenCalledWith('f1', 'h1');
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'activacion_historia' }),
    );
  });

  it('una historia Activa no cambia (nunca vuelve a Borrador)', async () => {
    const { historias, auditoria } = dependencias();
    vi.mocked(historias.buscarPorId).mockResolvedValue(filaHistoria({ estado: 'ACTIVA' }));

    await new MarcarHistoriaActivaCasoUso(historias, auditoria).ejecutar('f1', 'h1');

    expect(historias.marcarActiva).not.toHaveBeenCalled();
  });

  it('rechaza datos incompletos, archivadas y ajenas', async () => {
    const { historias, auditoria } = dependencias();
    const casoUso = new MarcarHistoriaActivaCasoUso(historias, auditoria);

    vi.mocked(historias.buscarPorId).mockResolvedValue(filaHistoria({ telefono: null }));
    await expect(casoUso.ejecutar('f1', 'h1')).rejects.toThrow(ConflictException);
    vi.mocked(historias.buscarPorId).mockResolvedValue(filaHistoria({ archivada: true }));
    await expect(casoUso.ejecutar('f1', 'h1')).rejects.toThrow(ConflictException);
    vi.mocked(historias.buscarPorId).mockResolvedValue(null);
    await expect(casoUso.ejecutar('f2', 'h1')).rejects.toThrow(NotFoundException);
    expect(historias.marcarActiva).not.toHaveBeenCalled();
  });
});
