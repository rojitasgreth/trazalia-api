import type { UsuarioAutenticado } from '../acceso/guardias/autenticacion.guard.js';
import type { ActualizarHistoriaCasoUso } from './casos-uso/actualizar-historia.caso-uso.js';
import type { BuscarCoincidenciasCasoUso } from './casos-uso/buscar-coincidencias.caso-uso.js';
import type { CrearHistoriaCasoUso } from './casos-uso/crear-historia.caso-uso.js';
import type { ListarHistoriasCasoUso } from './casos-uso/listar-historias.caso-uso.js';
import type { ObtenerHistoriaCasoUso } from './casos-uso/obtener-historia.caso-uso.js';
import { HistoriasController } from './historias.controller.js';
import { SinRegistrosClinicos } from './puertos/registros-clinicos.js';

const FISIO: UsuarioAutenticado = { idUsuario: 'f1', rol: 'FISIOTERAPEUTA', idSesion: 's1' };

function crearControlador() {
  const crear = { ejecutar: vi.fn().mockResolvedValue({ idHistoria: 'h1' }) };
  const listar = { ejecutar: vi.fn().mockResolvedValue({ datos: [] }) };
  const obtener = { ejecutar: vi.fn().mockResolvedValue({ idHistoria: 'h1' }) };
  const coincidencias = { ejecutar: vi.fn().mockResolvedValue({ resultado: 'ninguna' }) };
  const actualizar = { ejecutar: vi.fn().mockResolvedValue({ idHistoria: 'h1' }) };
  const controlador = new HistoriasController(
    crear as unknown as CrearHistoriaCasoUso,
    listar as unknown as ListarHistoriasCasoUso,
    obtener as unknown as ObtenerHistoriaCasoUso,
    coincidencias as unknown as BuscarCoincidenciasCasoUso,
    actualizar as unknown as ActualizarHistoriaCasoUso,
  );
  return { controlador, crear, listar, obtener, coincidencias, actualizar };
}

describe('HistoriasController', () => {
  it('toma el propietario de la sesión, nunca del cliente', async () => {
    const { controlador, crear, listar, obtener } = crearControlador();
    const cuerpo = { tipo: 'TRAUMA_ADULTO' as const, nombre: 'Carlos', apellido: 'Andrade' };
    const query = { archivadas: 'false' as const, pagina: 1, porPagina: 20 };

    await expect(controlador.postCrear(FISIO, cuerpo)).resolves.toEqual({
      historia: { idHistoria: 'h1' },
    });
    await controlador.getListar(FISIO, query);
    await expect(controlador.getDetalle(FISIO, 'h1')).resolves.toEqual({
      historia: { idHistoria: 'h1' },
    });

    expect(crear.ejecutar).toHaveBeenCalledWith('f1', cuerpo);
    expect(listar.ejecutar).toHaveBeenCalledWith('f1', query);
    expect(obtener.ejecutar).toHaveBeenCalledWith('f1', 'h1');
  });

  it('consulta coincidencias con el propietario de la sesión', async () => {
    const { controlador, coincidencias } = crearControlador();
    const consulta = { tipo: 'NEURO_ADULTO' as const, nacionalidad: 'V' as const, cedula: '1' };

    await expect(controlador.postCoincidencias(FISIO, consulta)).resolves.toEqual({
      resultado: 'ninguna',
    });
    expect(coincidencias.ejecutar).toHaveBeenCalledWith('f1', consulta);
  });

  it('edita la historia del propietario de la sesión', async () => {
    const { controlador, actualizar } = crearControlador();
    const cuerpo = { nombre: 'Carlos', apellido: 'Andrade', propagar: true };

    await expect(controlador.patchActualizar(FISIO, 'h1', cuerpo)).resolves.toEqual({
      historia: { idHistoria: 'h1' },
    });
    expect(actualizar.ejecutar).toHaveBeenCalledWith('f1', 'h1', cuerpo);
  });
});

describe('SinRegistrosClinicos', () => {
  it('en esta fase ninguna historia tiene registros clínicos', async () => {
    await expect(new SinRegistrosClinicos().tieneRegistros()).resolves.toBe(false);
  });
});
