import { ConflictException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { PrismaService } from '../../compartido/prisma/prisma.service.js';
import type { CentroMedico } from '../../generado/prisma/client.js';
import type { UsuarioAutenticado } from '../acceso/guardias/autenticacion.guard.js';
import type { AuditoriaServicio } from '../auditoria/auditoria.servicio.js';
import { BuscarCentrosCasoUso } from './casos-uso/buscar-centros.caso-uso.js';
import { CrearCentroCasoUso } from './casos-uso/crear-centro.caso-uso.js';
import { CentrosController } from './centros.controller.js';
import { CentrosServicio } from './centros.servicio.js';
import { limpiarTexto, normalizarTexto } from './dominio/normalizar.js';
import { CentroRepositorio } from './repositorios/centro.repositorio.js';

function fila(cambios: Partial<CentroMedico> = {}): CentroMedico {
  return {
    idCentro: 'c1',
    nombre: 'Clínica Santa Sofía',
    nombreNormalizado: 'clinica santa sofia',
    dirEstado: 'Miranda',
    dirMunicipio: 'Sucre',
    municipioNormalizado: 'sucre',
    dirParroquia: 'Petare',
    dirComunidad: null,
    idFisioterapeutaCreador: 'f1',
    fechaCreacion: new Date('2026-11-17T12:00:00.000Z'),
    ...cambios,
  };
}

function repositorio() {
  return {
    buscarPorNombre: vi.fn().mockResolvedValue([]),
    buscarDuplicado: vi.fn().mockResolvedValue(null),
    crear: vi.fn().mockResolvedValue(fila()),
    buscarPorIds: vi.fn().mockResolvedValue([fila()]),
  } as unknown as CentroRepositorio;
}

const COMANDO = {
  nombre: '  Clínica   Santa Sofía ',
  dirEstado: 'Miranda' as const,
  dirMunicipio: 'Sucre',
  dirParroquia: 'Petare',
  dirComunidad: ' ',
};

describe('normalización de centros (ADR-0004)', () => {
  it('ignora mayúsculas, tildes y espacios repetidos', () => {
    expect(normalizarTexto('  Clínica  SANTA Sofía ')).toBe('clinica santa sofia');
    expect(normalizarTexto('Centro Médico Ñapo')).toBe('centro medico napo');
    expect(limpiarTexto('  Clínica   Santa  ')).toBe('Clínica Santa');
  });
});

describe('BuscarCentrosCasoUso (B29)', () => {
  it('busca por el texto normalizado y prioriza los que empiezan por él', async () => {
    const centros = repositorio();
    vi.mocked(centros.buscarPorNombre).mockResolvedValue([
      fila({
        idCentro: 'c2',
        nombre: 'Policlínica Las Mercedes',
        nombreNormalizado: 'policlinica las mercedes',
      }),
      fila({ idCentro: 'c3', nombre: 'Clínica Ávila', nombreNormalizado: 'clinica avila' }),
    ]);

    const resultado = await new BuscarCentrosCasoUso(centros).ejecutar('CLÍNICA');

    expect(centros.buscarPorNombre).toHaveBeenCalledWith('clinica', 20);
    expect(resultado.map((c) => c.idCentro)).toEqual(['c3', 'c2']);
    // Nunca expone quién registró el centro.
    expect(resultado[0]).not.toHaveProperty('idFisioterapeutaCreador');
  });
});

describe('CrearCentroCasoUso (B31)', () => {
  const auditoria = () => ({ registrar: vi.fn() }) as unknown as AuditoriaServicio;

  it('registra el centro limpio y normalizado, y lo audita', async () => {
    const centros = repositorio();
    const registro = auditoria();

    const centro = await new CrearCentroCasoUso(centros, registro).ejecutar('f1', COMANDO);

    expect(centros.crear).toHaveBeenCalledWith({
      nombre: 'Clínica Santa Sofía',
      nombreNormalizado: 'clinica santa sofia',
      dirEstado: 'Miranda',
      dirMunicipio: 'Sucre',
      municipioNormalizado: 'sucre',
      dirParroquia: 'Petare',
      dirComunidad: null,
      idFisioterapeutaCreador: 'f1',
    });
    expect(centro).toEqual({
      idCentro: 'c1',
      nombre: 'Clínica Santa Sofía',
      estado: 'Miranda',
      municipio: 'Sucre',
      parroquia: 'Petare',
      comunidad: null,
    });
    expect(registro.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoEvento: 'creacion_centro',
        metadatosMinimos: { idCentro: 'c1' },
      }),
    );
  });

  it('RF-031: si ya existe responde 409 con el centro existente', async () => {
    const centros = repositorio();
    vi.mocked(centros.buscarDuplicado).mockResolvedValue(fila({ idCentro: 'existente' }));

    const intento = new CrearCentroCasoUso(centros, auditoria()).ejecutar('f1', COMANDO);

    await expect(intento).rejects.toThrow(ConflictException);
    await intento.catch((error: ConflictException) =>
      expect(error.getResponse()).toMatchObject({ centro: { idCentro: 'existente' } }),
    );
    expect(centros.crear).not.toHaveBeenCalled();
  });

  it('concurrencia: si el índice único salta, devuelve el centro ganador', async () => {
    const centros = repositorio();
    vi.mocked(centros.crear).mockRejectedValue(
      new PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: '7.10.1' }),
    );
    vi.mocked(centros.buscarDuplicado)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fila({ idCentro: 'ganador' }));

    const intento = new CrearCentroCasoUso(centros, auditoria()).ejecutar('f1', COMANDO);

    await expect(intento).rejects.toThrow(ConflictException);
  });

  it('propaga otros errores', async () => {
    const centros = repositorio();
    vi.mocked(centros.crear).mockRejectedValue(new Error('caída'));

    await expect(
      new CrearCentroCasoUso(centros, auditoria()).ejecutar('f1', COMANDO),
    ).rejects.toThrow('caída');
  });
});

describe('CentrosServicio (interfaz pública)', () => {
  it('devuelve los centros existentes indexados por id', async () => {
    const centros = repositorio();

    const mapa = await new CentrosServicio(centros).obtener(['c1', 'c1', 'nada']);

    expect(centros.buscarPorIds).toHaveBeenCalledWith(['c1', 'nada']);
    expect(mapa.get('c1')?.nombre).toBe('Clínica Santa Sofía');
    expect(mapa.has('nada')).toBe(false);
  });
});

describe('CentroRepositorio', () => {
  function prisma() {
    const centroMedico = {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(fila()),
    };
    return {
      centroMedico,
      repositorio: new CentroRepositorio({ centroMedico } as unknown as PrismaService),
    };
  }

  it('busca, detecta duplicados y crea sin filtrar por fisioterapeuta (catálogo compartido)', async () => {
    const { centroMedico, repositorio: repo } = prisma();

    await repo.buscarPorNombre('clinica', 20);
    await repo.buscarDuplicado('clinica santa sofia', 'Miranda', 'sucre');
    await repo.buscarPorIds(['c1']);
    await repo.crear({
      nombre: 'X',
      nombreNormalizado: 'x',
      dirEstado: 'Lara',
      dirMunicipio: 'Iribarren',
      municipioNormalizado: 'iribarren',
      dirParroquia: 'Catedral',
      dirComunidad: null,
      idFisioterapeutaCreador: 'f1',
    });

    expect(centroMedico.findMany).toHaveBeenNthCalledWith(1, {
      where: { nombreNormalizado: { contains: 'clinica' } },
      orderBy: { nombreNormalizado: 'asc' },
      take: 20,
    });
    expect(centroMedico.findUnique).toHaveBeenCalledWith({
      where: {
        nombreNormalizado_dirEstado_municipioNormalizado: {
          nombreNormalizado: 'clinica santa sofia',
          dirEstado: 'Miranda',
          municipioNormalizado: 'sucre',
        },
      },
    });
    expect(centroMedico.findMany).toHaveBeenNthCalledWith(2, {
      where: { idCentro: { in: ['c1'] } },
    });
    expect(centroMedico.create).toHaveBeenCalled();
  });

  it('sin ids no consulta', async () => {
    const { centroMedico, repositorio: repo } = prisma();

    await expect(repo.buscarPorIds([])).resolves.toEqual([]);
    expect(centroMedico.findMany).not.toHaveBeenCalled();
  });
});

describe('CentrosController', () => {
  it('busca y crea con el fisioterapeuta de la sesión', async () => {
    const buscar = { ejecutar: vi.fn().mockResolvedValue([]) };
    const crear = { ejecutar: vi.fn().mockResolvedValue({ idCentro: 'c1' }) };
    const controlador = new CentrosController(
      buscar as unknown as BuscarCentrosCasoUso,
      crear as unknown as CrearCentroCasoUso,
    );
    const fisio: UsuarioAutenticado = { idUsuario: 'f1', rol: 'FISIOTERAPEUTA', idSesion: 's1' };

    await expect(controlador.getBuscar({ texto: 'cli' })).resolves.toEqual({ datos: [] });
    await expect(controlador.postCrear(fisio, COMANDO)).resolves.toEqual({
      centro: { idCentro: 'c1' },
    });
    expect(crear.ejecutar).toHaveBeenCalledWith('f1', COMANDO);
  });
});
