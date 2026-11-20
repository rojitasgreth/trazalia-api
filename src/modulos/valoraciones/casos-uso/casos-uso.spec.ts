import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generado/prisma/client.js';
import type { Valoracion } from '../../../generado/prisma/client.js';
import type { UsuarioRepositorio } from '../../acceso/repositorios/usuario.repositorio.js';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { MarcarHistoriaActivaCasoUso } from '../../historias/casos-uso/marcar-historia-activa.caso-uso.js';
import type { ObtenerHistoriaCasoUso } from '../../historias/casos-uso/obtener-historia.caso-uso.js';
import { datosCarlos } from '../../historias/pruebas/fabricas.js';
import type { HistoriaDetalle } from '../../historias/vista/historia-vista.js';
import type { ValoracionRepositorio } from '../repositorios/valoracion.repositorio.js';
import { ContextoValoracion } from './contexto-valoracion.js';
import { FinalizarValoracionCasoUso } from './finalizar-valoracion.caso-uso.js';
import { GuardarValoracionCasoUso } from './guardar-valoracion.caso-uso.js';
import { IniciarValoracionCasoUso } from './iniciar-valoracion.caso-uso.js';
import { ObtenerValoracionCasoUso } from './obtener-valoracion.caso-uso.js';
import { RegistrarImpresionCasoUso } from './registrar-impresion.caso-uso.js';

function historia(cambios: Partial<HistoriaDetalle> = {}): HistoriaDetalle {
  return {
    idHistoria: 'h1',
    tipo: 'TRAUMA_ADULTO',
    estado: 'BORRADOR',
    archivada: false,
    nombre: 'Carlos',
    apellido: 'Andrade',
    datos: datosCarlos(),
    puedeIniciarValoracion: true,
    camposFaltantes: [],
    ...cambios,
  } as HistoriaDetalle;
}

function valoracion(cambios: Partial<Valoracion> = {}): Valoracion {
  return {
    idValoracion: 'v1',
    idHistoria: 'h1',
    idFisioterapeuta: 'f1',
    nombreFisioterapeuta: 'Daniela Ortega',
    tipo: 'TRAUMA_ADULTO',
    estado: 'EN_CURSO',
    versionFicha: 1,
    contenido: {},
    datosPersonales: null,
    version: 1,
    fechaInicio: new Date('2026-11-19T12:00:00Z'),
    fechaFinalizacion: null,
    fechaActualizacion: new Date('2026-11-19T12:00:00Z'),
    ...cambios,
  };
}

function preparar(h = historia(), v: Valoracion | null = null) {
  const obtenerHistoria = { ejecutar: vi.fn().mockResolvedValue(h) };
  const repositorio = {
    buscarPorHistoria: vi.fn().mockResolvedValue(v),
    crear: vi.fn().mockImplementation((d: object) => Promise.resolve(valoracion(d))),
    guardar: vi.fn().mockResolvedValue(valoracion({ version: 2 })),
    finalizar: vi.fn(async (_f, _v, _ver, _datos, ademas: (tx: object) => Promise<void>) => {
      await ademas({});
      return valoracion({ estado: 'FINALIZADA', fechaFinalizacion: new Date() });
    }),
  };
  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
    registrarEnTransaccion: vi.fn().mockResolvedValue(undefined),
  };
  const usuarios = {
    buscarNombresPorIds: vi.fn().mockResolvedValue(new Map([['f1', 'Daniela Ortega']])),
  };
  const marcarActiva = { ejecutarEnTransaccion: vi.fn().mockResolvedValue(undefined) };
  const contexto = new ContextoValoracion(
    obtenerHistoria as unknown as ObtenerHistoriaCasoUso,
    repositorio as unknown as ValoracionRepositorio,
  );
  const repo = repositorio as unknown as ValoracionRepositorio;
  const audit = auditoria as unknown as AuditoriaServicio;
  return {
    repositorio,
    auditoria,
    marcarActiva,
    obtener: new ObtenerValoracionCasoUso(contexto),
    iniciar: new IniciarValoracionCasoUso(
      contexto,
      repo,
      usuarios as unknown as UsuarioRepositorio,
      audit,
    ),
    guardar: new GuardarValoracionCasoUso(contexto, repo),
    finalizar: new FinalizarValoracionCasoUso(
      contexto,
      repo,
      marcarActiva as unknown as MarcarHistoriaActivaCasoUso,
      audit,
    ),
    imprimir: new RegistrarImpresionCasoUso(contexto, audit),
  };
}

describe('Casos de uso de valoraciones (SPEC C)', () => {
  it('obtener sin valoración devuelve la ficha vigente y los datos vigentes', async () => {
    const r = await preparar().obtener.ejecutar('f1', 'h1');
    expect(r.valoracion).toBeNull();
    expect(r.ficha.tipo).toBe('TRAUMA_ADULTO');
    expect(r.datos.nombre).toBe('Carlos Andrade');
  });

  it('obtener una finalizada devuelve la foto de los datos personales', async () => {
    const foto = { nombre: 'Foto', telefono: '0412' };
    const r = await preparar(
      historia(),
      valoracion({ estado: 'FINALIZADA', datosPersonales: foto }),
    ).obtener.ejecutar('f1', 'h1');
    expect(r.datos).toEqual(foto);
  });

  it('RF-C01: no inicia si faltan datos personales o ya existe la valoración', async () => {
    await expect(
      preparar(
        historia({ puedeIniciarValoracion: false, camposFaltantes: ['telefono'] }),
      ).iniciar.ejecutar('f1', 'h1'),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      preparar(historia(), valoracion()).iniciar.ejecutar('f1', 'h1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('RF-C03/RF-C19: inicia con el nombre del fisioterapeuta, precarga y audita sin datos clínicos', async () => {
    const { iniciar, repositorio, auditoria } = preparar();
    await iniciar.ejecutar('f1', 'h1');
    expect(repositorio.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        nombreFisioterapeuta: 'Daniela Ortega',
        versionFicha: 1,
        contenido: { 's11.paciente_representante_nombre': 'Carlos Andrade' },
      }),
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoEvento: 'inicio_valoracion',
        metadatosMinimos: { idHistoria: 'h1', idValoracion: expect.any(String) },
      }),
    );
  });

  it('RF-C02: un INSERT concurrente responde 409; otro error se propaga', async () => {
    const unico = new Prisma.PrismaClientKnownRequestError('único', {
      code: 'P2002',
      clientVersion: 'x',
    });
    const a = preparar();
    a.repositorio.crear.mockRejectedValue(unico);
    await expect(a.iniciar.ejecutar('f1', 'h1')).rejects.toBeInstanceOf(ConflictException);
    const b = preparar();
    b.repositorio.crear.mockRejectedValue(new Error('caída'));
    await expect(b.iniciar.ejecutar('f1', 'h1')).rejects.toThrow('caída');
  });

  it('guardar: sin valoración 404; finalizada o archivada 409; contenido inválido 400', async () => {
    await expect(
      preparar().guardar.ejecutar('f1', 'h1', { contenido: {}, version: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      preparar(historia(), valoracion({ estado: 'FINALIZADA' })).guardar.ejecutar('f1', 'h1', {
        contenido: {},
        version: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      preparar(historia({ archivada: true }), valoracion()).guardar.ejecutar('f1', 'h1', {
        contenido: {},
        version: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      preparar(historia(), valoracion()).guardar.ejecutar('f1', 'h1', {
        contenido: { x: 1 },
        version: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('§13: guardar con una versión vieja responde 409; con la vigente guarda normalizado', async () => {
    const vieja = preparar(historia(), valoracion());
    vieja.repositorio.guardar.mockResolvedValue(null);
    await expect(
      vieja.guardar.ejecutar('f1', 'h1', { contenido: {}, version: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);

    const ok = preparar(historia(), valoracion());
    const r = await ok.guardar.ejecutar('f1', 'h1', {
      contenido: { 's2.fase': ' Aguda ' },
      version: 1,
    });
    expect(ok.repositorio.guardar).toHaveBeenCalledWith('f1', 'v1', 1, { 's2.fase': 'Aguda' });
    expect(r.valoracion?.version).toBe(2);
  });

  it('RF-C13: finalizar marca la historia Activa y audita en la misma transacción', async () => {
    const { finalizar, marcarActiva, auditoria, repositorio } = preparar(historia(), valoracion());
    const r = await finalizar.ejecutar('f1', 'h1', 1);
    expect(marcarActiva.ejecutarEnTransaccion).toHaveBeenCalledWith({}, 'f1', 'h1');
    expect(auditoria.registrarEnTransaccion).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ tipoEvento: 'finalizacion_valoracion' }),
    );
    expect(repositorio.finalizar.mock.calls[0]![3]).toMatchObject({ nombre: 'Carlos Andrade' });
    expect(r.historia.estado).toBe('ACTIVA');
    expect(r.valoracion?.estado).toBe('FINALIZADA');
  });

  it('finalizar: sin valoración 404; finalizada, archivada o versión vieja 409', async () => {
    await expect(preparar().finalizar.ejecutar('f1', 'h1', 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      preparar(historia(), valoracion({ estado: 'FINALIZADA' })).finalizar.ejecutar('f1', 'h1', 1),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      preparar(historia({ archivada: true }), valoracion()).finalizar.ejecutar('f1', 'h1', 1),
    ).rejects.toBeInstanceOf(ConflictException);
    const vieja = preparar(historia(), valoracion());
    vieja.repositorio.finalizar.mockResolvedValue(null as never);
    await expect(vieja.finalizar.ejecutar('f1', 'h1', 1)).rejects.toBeInstanceOf(ConflictException);
  });

  it('RF-C19: la impresión se audita solo si está finalizada', async () => {
    await expect(preparar().imprimir.ejecutar('f1', 'h1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      preparar(historia(), valoracion()).imprimir.ejecutar('f1', 'h1'),
    ).rejects.toBeInstanceOf(ConflictException);
    const ok = preparar(historia(), valoracion({ estado: 'FINALIZADA' }));
    await ok.imprimir.ejecutar('f1', 'h1');
    expect(ok.auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'impresion_valoracion' }),
    );
  });
});
