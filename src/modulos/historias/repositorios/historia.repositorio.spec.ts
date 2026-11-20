import type { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import { datosInfantilesVacios } from '../dominio/datos-infantiles.js';
import { datosCarlos } from '../pruebas/fabricas.js';
import { aFechaBd, deFechaBd, HistoriaRepositorio } from './historia.repositorio.js';

function crearRepositorio() {
  const historiaClinica = {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({ idHistoria: 'h1' }),
    update: vi.fn().mockResolvedValue({ idHistoria: 'h1' }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const paciente = {
    create: vi.fn().mockResolvedValue({ idPaciente: 'p-nuevo' }),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const representanteHistoria = { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) };
  const datosInfantilesHistoria = { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) };
  const tx = { historiaClinica, paciente, representanteHistoria, datosInfantilesHistoria };
  const prisma = {
    historiaClinica,
    paciente,
    $transaction: vi.fn((fn: (cliente: typeof tx) => unknown) => fn(tx)),
  } as unknown as PrismaService;
  return {
    repositorio: new HistoriaRepositorio(prisma),
    historiaClinica,
    paciente,
    representanteHistoria,
    datosInfantilesHistoria,
  };
}

describe('HistoriaRepositorio', () => {
  it('convierte fechas AAAA-MM-DD a DATE y de vuelta sin desplazar el día', () => {
    expect(aFechaBd('1985-03-14')?.toISOString()).toBe('1985-03-14T00:00:00.000Z');
    expect(deFechaBd(aFechaBd('1985-03-14'))).toBe('1985-03-14');
    expect(aFechaBd(null)).toBeNull();
    expect(deFechaBd(null)).toBeNull();
  });

  it('busca por documento solo dentro del propietario', async () => {
    const { repositorio, historiaClinica } = crearRepositorio();

    await repositorio.buscarPorDocumento('f1', 'V', '15482301');

    expect(historiaClinica.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idFisioterapeuta: 'f1', nacionalidad: 'V', cedula: '15482301' },
      }),
    );
  });

  it('busca por nombre, apellido (sin distinguir mayúsculas) y nacimiento', async () => {
    const { repositorio, historiaClinica } = crearRepositorio();

    await repositorio.buscarPorNombreYNacimiento('f1', 'sofía', 'MARTÍNEZ', '2022-06-10');

    expect(historiaClinica.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          idFisioterapeuta: 'f1',
          nombre: { equals: 'sofía', mode: 'insensitive' },
          apellido: { equals: 'MARTÍNEZ', mode: 'insensitive' },
          fechaNacimiento: new Date('2022-06-10T00:00:00.000Z'),
        },
      }),
    );
  });

  it('crea el paciente ancla y la historia en una transacción', async () => {
    const { repositorio, historiaClinica, paciente } = crearRepositorio();

    await repositorio.crear('f1', null, 'TRAUMA_ADULTO', datosCarlos());

    expect(paciente.create).toHaveBeenCalledWith({ data: { idFisioterapeuta: 'f1' } });
    expect(historiaClinica.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idPaciente: 'p-nuevo',
          idFisioterapeuta: 'f1',
          tipo: 'TRAUMA_ADULTO',
          fechaNacimiento: new Date('1985-03-14T00:00:00.000Z'),
        }),
      }),
    );
  });

  it('crea el representante anidado en la historia infantil', async () => {
    const { repositorio, historiaClinica } = crearRepositorio();

    await repositorio.crear('f1', null, 'REHAB_INFANTIL', datosCarlos(), {
      parentesco: 'MADRE',
      nombre: 'Laura',
      apellido: null,
      cedula: null,
      edad: 35,
      estadoCivil: null,
      gradoInstruccion: null,
      ocupacion: null,
    });

    expect(historiaClinica.create.mock.calls[0]![0].data.representante).toEqual({
      create: expect.objectContaining({
        nombre: 'Laura',
        edad: 35,
      }),
    });
  });

  it('reutiliza el paciente existente sin crear otro', async () => {
    const { repositorio, historiaClinica, paciente } = crearRepositorio();

    await repositorio.crear('f1', 'p-carlos', 'NEURO_ADULTO', datosCarlos());

    expect(paciente.create).not.toHaveBeenCalled();
    expect(historiaClinica.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ idPaciente: 'p-carlos' }) }),
    );
  });

  it('ADR-0002: actualiza la historia y propaga en la misma transacción', async () => {
    const { repositorio, historiaClinica, representanteHistoria } = crearRepositorio();

    await repositorio.actualizar('f1', 'h1', datosCarlos(), null, [
      { idHistoria: 'h2', cambios: { telefono: '0424', fechaNacimiento: '1985-03-14' } },
      { idHistoria: 'h3', cambios: { nombre: 'Carlos' } },
    ]);

    expect(representanteHistoria.deleteMany).toHaveBeenCalledWith({ where: { idHistoria: 'h1' } });
    expect(historiaClinica.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { idHistoria: 'h1', idFisioterapeuta: 'f1', archivada: false },
      }),
    );
    expect(historiaClinica.update).toHaveBeenNthCalledWith(2, {
      where: { idHistoria: 'h2', idFisioterapeuta: 'f1', archivada: false },
      data: { telefono: '0424', fechaNacimiento: new Date('1985-03-14T00:00:00.000Z') },
    });
    expect(historiaClinica.update).toHaveBeenNthCalledWith(3, {
      where: { idHistoria: 'h3', idFisioterapeuta: 'f1', archivada: false },
      data: { nombre: 'Carlos' },
    });
  });

  it('reemplaza el representante al actualizar', async () => {
    const { repositorio, historiaClinica } = crearRepositorio();

    await repositorio.actualizar(
      'f1',
      'h1',
      datosCarlos(),
      {
        parentesco: 'PADRE',
        nombre: 'José',
        apellido: null,
        cedula: null,
        edad: null,
        estadoCivil: null,
        gradoInstruccion: null,
        ocupacion: null,
      },
      [],
    );

    expect(historiaClinica.update.mock.calls[0]![0].data.representante).toEqual({
      create: expect.objectContaining({ parentesco: 'PADRE', nombre: 'José' }),
    });
  });

  it('§13.3: elimina la historia, el paciente sin historias y audita en la transacción', async () => {
    const { repositorio, historiaClinica, paciente } = crearRepositorio();
    const auditar = vi.fn().mockResolvedValue(undefined);
    historiaClinica.count.mockResolvedValue(0);

    await repositorio.eliminar('f1', { idHistoria: 'h1', idPaciente: 'p1' }, auditar);

    expect(historiaClinica.delete).toHaveBeenCalledWith({
      where: { idHistoria: 'h1', idFisioterapeuta: 'f1' },
    });
    expect(paciente.delete).toHaveBeenCalledWith({ where: { idPaciente: 'p1' } });
    expect(auditar).toHaveBeenCalledWith(expect.objectContaining({ historiaClinica }));
  });

  it('conserva el paciente si le quedan otras historias', async () => {
    const { repositorio, historiaClinica, paciente } = crearRepositorio();
    historiaClinica.count.mockResolvedValue(1);

    await repositorio.eliminar('f1', { idHistoria: 'h1', idPaciente: 'p1' }, vi.fn());

    expect(paciente.delete).not.toHaveBeenCalled();
  });

  it('archiva y desarchiva con fecha de archivo', async () => {
    const { repositorio, historiaClinica } = crearRepositorio();

    await repositorio.cambiarArchivo('f1', 'h1', true);
    await repositorio.cambiarArchivo('f1', 'h1', false);

    expect(historiaClinica.update.mock.calls[0]![0]).toMatchObject({
      where: { idHistoria: 'h1', idFisioterapeuta: 'f1' },
      data: { archivada: true, fechaArchivo: expect.any(Date) },
    });
    expect(historiaClinica.update.mock.calls[1]![0].data).toEqual({
      archivada: false,
      fechaArchivo: null,
    });
  });

  it('marca Activa solo una historia en Borrador y no archivada', async () => {
    const { repositorio, historiaClinica } = crearRepositorio();

    await repositorio.marcarActiva('f1', 'h1');

    expect(historiaClinica.update).toHaveBeenCalledWith({
      where: { idHistoria: 'h1', idFisioterapeuta: 'f1', estado: 'BORRADOR', archivada: false },
      data: { estado: 'ACTIVA' },
    });
  });

  it('obtiene por id siempre filtrando por propietario', async () => {
    const { repositorio, historiaClinica } = crearRepositorio();

    await repositorio.buscarPorId('f1', 'h1');

    expect(historiaClinica.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idHistoria: 'h1', idFisioterapeuta: 'f1' } }),
    );
  });

  it('lista las otras historias del paciente excluyendo la actual', async () => {
    const { repositorio, historiaClinica } = crearRepositorio();

    await repositorio.listarOtrasDelPaciente('f1', 'p1', 'h1');

    expect(historiaClinica.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idFisioterapeuta: 'f1', idPaciente: 'p1', idHistoria: { not: 'h1' } },
      }),
    );
  });

  it('lista con filtros, texto por palabras y rango de creación inclusivo', async () => {
    const { repositorio, historiaClinica } = crearRepositorio();

    await repositorio.listar('f1', {
      texto: 'carlos 15.482',
      tipo: 'TRAUMA_ADULTO',
      estado: 'BORRADOR',
      archivadas: false,
      creadaDesde: '2026-11-01',
      creadaHasta: '2026-11-16',
      pagina: 2,
      porPagina: 10,
    });

    const llamada = historiaClinica.findMany.mock.calls[0]![0];
    expect(llamada.skip).toBe(10);
    expect(llamada.take).toBe(10);
    expect(llamada.where).toMatchObject({
      idFisioterapeuta: 'f1',
      archivada: false,
      tipo: 'TRAUMA_ADULTO',
      estado: 'BORRADOR',
      fechaCreacion: {
        gte: new Date('2026-11-01T00:00:00.000Z'),
        lt: new Date('2026-11-17T00:00:00.000Z'),
      },
    });
    expect(llamada.where.AND).toHaveLength(2);
    // "carlos" no tiene dígitos: no se busca en la cédula.
    expect(llamada.where.AND[0].OR).toHaveLength(2);
    expect(llamada.where.AND[1].OR[2]).toEqual({ cedula: { contains: '15482' } });
  });

  it('lista sin filtros opcionales', async () => {
    const { repositorio, historiaClinica } = crearRepositorio();

    await repositorio.listar('f1', { archivadas: true, pagina: 1, porPagina: 20 });

    expect(historiaClinica.findMany.mock.calls[0]![0].where).toEqual({
      idFisioterapeuta: 'f1',
      archivada: true,
      AND: [],
    });
  });

  it('cuenta historias y archivadas del propietario', async () => {
    const { repositorio, historiaClinica } = crearRepositorio();
    historiaClinica.count.mockResolvedValueOnce(8).mockResolvedValueOnce(2);

    await expect(repositorio.contar('f1')).resolves.toEqual({ historias: 8, archivadas: 2 });
  });
});

describe('HistoriaRepositorio: datos infantiles (v1.6 §8.4)', () => {
  it('crea y reemplaza los datos infantiles junto con la historia', async () => {
    const { repositorio, historiaClinica, datosInfantilesHistoria } = crearRepositorio();
    const infantiles = { ...datosInfantilesVacios(), gestas: 2, vacunas: 'Completas' };

    await repositorio.crear('f1', null, 'REHAB_INFANTIL', datosCarlos(), null, infantiles);
    await repositorio.actualizar('f1', 'h1', datosCarlos(), null, [], infantiles);

    expect(historiaClinica.create.mock.calls[0]![0].data.datosInfantiles).toEqual({
      create: infantiles,
    });
    expect(datosInfantilesHistoria.deleteMany).toHaveBeenCalledWith({
      where: { idHistoria: 'h1' },
    });
    expect(historiaClinica.update.mock.calls[0]![0].data.datosInfantiles).toEqual({
      create: infantiles,
    });
  });
});
