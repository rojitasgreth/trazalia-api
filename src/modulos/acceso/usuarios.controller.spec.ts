import type { ActualizarUsuarioCasoUso } from './casos-uso/actualizar-usuario.caso-uso.js';
import type { AdminCerrarSesionCasoUso } from './casos-uso/admin-cerrar-sesion.caso-uso.js';
import type { CrearUsuarioCasoUso } from './casos-uso/crear-usuario.caso-uso.js';
import type { DesbloquearUsuarioCasoUso } from './casos-uso/desbloquear-usuario.caso-uso.js';
import type { InactivarUsuarioCasoUso } from './casos-uso/inactivar-usuario.caso-uso.js';
import type { ListarSesionesDeUsuarioCasoUso } from './casos-uso/listar-sesiones-de-usuario.caso-uso.js';
import type { ListarUsuariosCasoUso } from './casos-uso/listar-usuarios.caso-uso.js';
import type { ObtenerUsuarioCasoUso } from './casos-uso/obtener-usuario.caso-uso.js';
import type { ReactivarUsuarioCasoUso } from './casos-uso/reactivar-usuario.caso-uso.js';
import type { ReenviarInvitacionCasoUso } from './casos-uso/reenviar-invitacion.caso-uso.js';
import type { SuspenderUsuarioCasoUso } from './casos-uso/suspender-usuario.caso-uso.js';
import { UsuariosController } from './usuarios.controller.js';

const ADMIN = { idUsuario: 'admin-1', rol: 'ADMINISTRADOR', idSesion: 's1' } as const;

function crearControlador() {
  const crearUsuario = {
    ejecutar: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
  } as unknown as CrearUsuarioCasoUso;
  const listarUsuarios = {
    ejecutar: vi.fn().mockResolvedValue({ datos: [], total: 0, pagina: 1, porPagina: 20 }),
  } as unknown as ListarUsuariosCasoUso;
  const obtenerUsuario = {
    ejecutar: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
  } as unknown as ObtenerUsuarioCasoUso;
  const actualizarUsuario = {
    ejecutar: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
  } as unknown as ActualizarUsuarioCasoUso;
  const suspenderUsuario = {
    ejecutar: vi.fn().mockResolvedValue(undefined),
  } as unknown as SuspenderUsuarioCasoUso;
  const reactivarUsuario = {
    ejecutar: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReactivarUsuarioCasoUso;
  const inactivarUsuario = {
    ejecutar: vi.fn().mockResolvedValue(undefined),
  } as unknown as InactivarUsuarioCasoUso;
  const reenviarInvitacion = {
    ejecutar: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReenviarInvitacionCasoUso;
  const listarSesionesDeUsuario = {
    ejecutar: vi.fn().mockResolvedValue([]),
  } as unknown as ListarSesionesDeUsuarioCasoUso;
  const adminCerrarSesion = {
    ejecutar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AdminCerrarSesionCasoUso;
  const desbloquearUsuario = {
    ejecutar: vi.fn().mockResolvedValue(undefined),
  } as unknown as DesbloquearUsuarioCasoUso;

  const controlador = new UsuariosController(
    crearUsuario,
    listarUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    suspenderUsuario,
    reactivarUsuario,
    inactivarUsuario,
    reenviarInvitacion,
    listarSesionesDeUsuario,
    adminCerrarSesion,
    desbloquearUsuario,
  );

  return {
    controlador,
    crearUsuario,
    listarUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    suspenderUsuario,
    reactivarUsuario,
    inactivarUsuario,
    reenviarInvitacion,
    listarSesionesDeUsuario,
    adminCerrarSesion,
    desbloquearUsuario,
  };
}

const COMANDO_CREAR = {
  nacionalidad: 'V' as const,
  cedula: '111',
  nombre: 'A',
  apellido: 'B',
  correo: 'a@b.com',
  rol: 'FISIOTERAPEUTA' as const,
};

describe('UsuariosController', () => {
  it('postCrear delega en CrearUsuarioCasoUso con el admin actuante', async () => {
    const { controlador, crearUsuario } = crearControlador();

    const resultado = await controlador.postCrear(ADMIN, COMANDO_CREAR);

    expect(crearUsuario.ejecutar).toHaveBeenCalledWith('admin-1', COMANDO_CREAR);
    expect(resultado).toEqual({ usuario: { idUsuario: 'u1' } });
  });

  it('getListar delega en ListarUsuariosCasoUso con los filtros de query', async () => {
    const { controlador, listarUsuarios } = crearControlador();

    await controlador.getListar({ pagina: 1, porPagina: 20 });

    expect(listarUsuarios.ejecutar).toHaveBeenCalledWith({ pagina: 1, porPagina: 20 });
  });

  it('getDetalle delega en ObtenerUsuarioCasoUso', async () => {
    const { controlador, obtenerUsuario } = crearControlador();

    const resultado = await controlador.getDetalle('u1');

    expect(obtenerUsuario.ejecutar).toHaveBeenCalledWith('u1');
    expect(resultado).toEqual({ usuario: { idUsuario: 'u1' } });
  });

  it('patchActualizar delega en ActualizarUsuarioCasoUso con el admin actuante', async () => {
    const { controlador, actualizarUsuario } = crearControlador();

    await controlador.patchActualizar(ADMIN, 'u1', { nombre: 'Nuevo' });

    expect(actualizarUsuario.ejecutar).toHaveBeenCalledWith('admin-1', 'u1', { nombre: 'Nuevo' });
  });

  it('postSuspender/postReactivar/postInactivar/postReenviarInvitacion delegan con el admin actuante', async () => {
    const {
      controlador,
      suspenderUsuario,
      reactivarUsuario,
      inactivarUsuario,
      reenviarInvitacion,
    } = crearControlador();

    await controlador.postSuspender(ADMIN, 'u1');
    await controlador.postReactivar(ADMIN, 'u1');
    await controlador.postInactivar(ADMIN, 'u1');
    await controlador.postReenviarInvitacion(ADMIN, 'u1');

    expect(suspenderUsuario.ejecutar).toHaveBeenCalledWith('admin-1', 'u1');
    expect(reactivarUsuario.ejecutar).toHaveBeenCalledWith('admin-1', 'u1');
    expect(inactivarUsuario.ejecutar).toHaveBeenCalledWith('admin-1', 'u1');
    expect(reenviarInvitacion.ejecutar).toHaveBeenCalledWith('admin-1', 'u1');
  });

  it('getSesiones y postCerrarSesion delegan en los casos de uso de sesión de otro usuario', async () => {
    const { controlador, listarSesionesDeUsuario, adminCerrarSesion } = crearControlador();

    await controlador.getSesiones('u1');
    await controlador.postCerrarSesion(ADMIN, 'u1', 's1');

    expect(listarSesionesDeUsuario.ejecutar).toHaveBeenCalledWith('u1');
    expect(adminCerrarSesion.ejecutar).toHaveBeenCalledWith('admin-1', 'u1', 's1');
  });

  it('postDesbloquear delega en DesbloquearUsuarioCasoUso con el admin actuante', async () => {
    const { controlador, desbloquearUsuario } = crearControlador();

    await controlador.postDesbloquear(ADMIN, 'u1');

    expect(desbloquearUsuario.ejecutar).toHaveBeenCalledWith('admin-1', 'u1');
  });
});
