import type { PrismaService } from '../../compartido/prisma/prisma.service.js';
import { datosCarlos } from '../historias/pruebas/fabricas.js';
import type { HistoriaDetalle } from '../historias/vista/historia-vista.js';
import type { FinalizarValoracionCasoUso } from './casos-uso/finalizar-valoracion.caso-uso.js';
import type { GuardarValoracionCasoUso } from './casos-uso/guardar-valoracion.caso-uso.js';
import type { IniciarValoracionCasoUso } from './casos-uso/iniciar-valoracion.caso-uso.js';
import type { ObtenerValoracionCasoUso } from './casos-uso/obtener-valoracion.caso-uso.js';
import type { RegistrarImpresionCasoUso } from './casos-uso/registrar-impresion.caso-uso.js';
import { datosDeLaFicha, edadDeLaFicha } from './dominio/datos-de-la-ficha.js';
import { RegistrosClinicosDeValoraciones } from './lectura/registros-clinicos-de-valoraciones.js';
import { ValoracionRepositorio } from './repositorios/valoracion.repositorio.js';
import { ValoracionesController } from './valoraciones.controller.js';

const HOY = new Date('2026-11-19T12:00:00Z');

function detalle(cambios: Partial<HistoriaDetalle> = {}): HistoriaDetalle {
  return {
    tipo: 'TRAUMA_ADULTO',
    datos: datosCarlos(),
    datosInfantiles: null,
    ...cambios,
  } as HistoriaDetalle;
}

describe('datosDeLaFicha (SPEC C §5)', () => {
  it('formatea los datos personales como los muestra la ficha', () => {
    const datos = datosDeLaFicha(
      detalle({
        datos: datosCarlos({
          contactoNombre: 'Patricia',
          contactoParentesco: 'Esposa',
          contactoTelefono: '0414',
          dirEstado: 'Miranda',
          dirMunicipio: 'Sucre',
          dirParroquia: 'Petare',
          fuenteInformacion: ['Paciente', 'Familiar'],
        }),
      }),
      HOY,
    );
    expect(datos).toMatchObject({
      nombre: 'Carlos Andrade',
      documento: 'V-15.482.301',
      fechaNacimiento: '14/03/1985',
      edad: '41 años',
      sexo: 'Masculino',
      contacto: 'Patricia · Esposa · 0414',
      residencia: 'Petare, Sucre, Miranda',
      fuenteInformacion: 'Paciente, Familiar',
    });
  });

  it('en infantil la edad va en años y meses, o la corregida a mano', () => {
    const nino = detalle({
      tipo: 'REHAB_INFANTIL',
      datos: datosCarlos({ fechaNacimiento: '2026-04-02' }),
    });
    expect(edadDeLaFicha(nino, HOY)).toBe('7 meses');
    expect(
      edadDeLaFicha({ ...nino, datos: datosCarlos({ fechaNacimiento: '2020-02-04' }) }, HOY),
    ).toBe('6 años 9 meses');
    expect(
      edadDeLaFicha(
        { ...nino, datosInfantiles: { edadCronologica: '7 meses y medio' } } as HistoriaDetalle,
        HOY,
      ),
    ).toBe('7 meses y medio');
  });

  it('sin documento, sin fecha o sin sexo deja el dato vacío o lo indica', () => {
    const datos = datosDeLaFicha(
      detalle({
        datos: datosCarlos({
          cedula: null,
          nacionalidad: null,
          sinDocumento: true,
          fechaNacimiento: null,
          sexo: null,
        }),
      }),
      HOY,
    );
    expect(datos).toMatchObject({
      documento: 'Sin documento',
      edad: '',
      fechaNacimiento: '',
      sexo: '',
    });
    expect(datosDeLaFicha(detalle({ datos: datosCarlos({ cedula: null }) }), HOY).documento).toBe(
      '',
    );
    expect(
      datosDeLaFicha(
        detalle({ datos: datosCarlos({ sexo: 'FEMENINO', nacionalidad: null }) }),
        HOY,
      ),
    ).toMatchObject({
      sexo: 'Femenino',
      documento: '15.482.301',
    });
  });
});

describe('ValoracionRepositorio', () => {
  function crear() {
    const valoracion = {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue({ idValoracion: 'v1' }),
      create: vi.fn().mockResolvedValue({ idValoracion: 'v1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      count: vi.fn().mockResolvedValue(0),
    };
    const prisma = {
      valoracion,
      $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn({ valoracion })),
    } as unknown as PrismaService;
    return { repositorio: new ValoracionRepositorio(prisma), valoracion, prisma };
  }

  it('busca siempre por propietario y crea con el contenido', async () => {
    const { repositorio, valoracion } = crear();
    await repositorio.buscarPorHistoria('f1', 'h1');
    expect(valoracion.findFirst).toHaveBeenCalledWith({
      where: { idFisioterapeuta: 'f1', idHistoria: 'h1' },
    });
    await repositorio.crear({
      idHistoria: 'h1',
      idFisioterapeuta: 'f1',
      nombreFisioterapeuta: 'D',
      tipo: 'TRAUMA_ADULTO',
      versionFicha: 1,
      contenido: { a: 'b' },
    });
    expect(valoracion.create.mock.calls[0]![0].data.contenido).toEqual({ a: 'b' });
  });

  it('§13: guarda solo con la versión esperada y En curso', async () => {
    const { repositorio, valoracion } = crear();
    expect(await repositorio.guardar('f1', 'v1', 3, {})).toEqual({ idValoracion: 'v1' });
    expect(valoracion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idValoracion: 'v1', idFisioterapeuta: 'f1', version: 3, estado: 'EN_CURSO' },
      }),
    );
    valoracion.updateMany.mockResolvedValue({ count: 0 });
    expect(await repositorio.guardar('f1', 'v1', 3, {})).toBeNull();
  });

  it('RF-C13: finaliza en una transacción; si no cambió nada no ejecuta lo demás', async () => {
    const { repositorio, valoracion } = crear();
    const ademas = vi.fn().mockResolvedValue(undefined);
    await repositorio.finalizar('f1', 'v1', 1, { nombre: 'C' } as never, ademas);
    expect(ademas).toHaveBeenCalledTimes(1);
    expect(valoracion.updateMany.mock.calls[0]![0].data).toMatchObject({
      estado: 'FINALIZADA',
      datosPersonales: { nombre: 'C' },
    });

    valoracion.updateMany.mockResolvedValue({ count: 0 });
    ademas.mockClear();
    expect(await repositorio.finalizar('f1', 'v1', 1, {} as never, ademas)).toBeNull();
    expect(ademas).not.toHaveBeenCalled();
  });

  it('ADR-0003: cualquier valoración cuenta como registro clínico', async () => {
    const { valoracion, prisma } = crear();
    const registros = new RegistrosClinicosDeValoraciones(prisma);
    expect(await registros.tieneRegistros('f1', 'h1')).toBe(false);
    valoracion.count.mockResolvedValue(1);
    expect(await registros.tieneRegistros('f1', 'h1')).toBe(true);
    expect(valoracion.count).toHaveBeenCalledWith({
      where: { idFisioterapeuta: 'f1', idHistoria: 'h1' },
    });
  });
});

describe('ValoracionesController', () => {
  it('delega en los casos de uso con el usuario de la sesión', async () => {
    const caso = () => ({ ejecutar: vi.fn().mockResolvedValue('ok') });
    const [obtener, iniciar, guardar, finalizar, imprimir] = [
      caso(),
      caso(),
      caso(),
      caso(),
      caso(),
    ];
    const controlador = new ValoracionesController(
      obtener as unknown as ObtenerValoracionCasoUso,
      iniciar as unknown as IniciarValoracionCasoUso,
      guardar as unknown as GuardarValoracionCasoUso,
      finalizar as unknown as FinalizarValoracionCasoUso,
      imprimir as unknown as RegistrarImpresionCasoUso,
    );
    const fisio = { idUsuario: 'f1', rol: 'FISIOTERAPEUTA' as const, idSesion: 's' };

    await controlador.getValoracion(fisio, 'h1');
    await controlador.postIniciar(fisio, 'h1');
    await controlador.putGuardar(fisio, 'h1', { contenido: {}, version: 2 });
    await controlador.postFinalizar(fisio, 'h1', { version: 3 });
    await controlador.postImpresion(fisio, 'h1');

    expect(obtener.ejecutar).toHaveBeenCalledWith('f1', 'h1');
    expect(iniciar.ejecutar).toHaveBeenCalledWith('f1', 'h1');
    expect(guardar.ejecutar).toHaveBeenCalledWith('f1', 'h1', { contenido: {}, version: 2 });
    expect(finalizar.ejecutar).toHaveBeenCalledWith('f1', 'h1', 3);
    expect(imprimir.ejecutar).toHaveBeenCalledWith('f1', 'h1');
  });
});
