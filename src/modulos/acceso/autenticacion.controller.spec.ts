import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AceptarInvitacionCasoUso } from './casos-uso/aceptar-invitacion.caso-uso.js';
import type { CerrarSesionCasoUso } from './casos-uso/cerrar-sesion.caso-uso.js';
import type { CerrarTodasSesionesCasoUso } from './casos-uso/cerrar-todas-sesiones.caso-uso.js';
import type { IniciarSesionCasoUso } from './casos-uso/iniciar-sesion.caso-uso.js';
import type { ListarSesionesCasoUso } from './casos-uso/listar-sesiones.caso-uso.js';
import type { ObtenerUsuarioActualCasoUso } from './casos-uso/obtener-usuario-actual.caso-uso.js';
import type { RegistrarActividadCasoUso } from './casos-uso/registrar-actividad.caso-uso.js';
import type { RenovarSesionCasoUso } from './casos-uso/renovar-sesion.caso-uso.js';
import { AutenticacionController } from './autenticacion.controller.js';
import type { CookiesServicio } from './jwt/cookies.servicio.js';

const USUARIO = { idUsuario: 'u1', rol: 'FISIOTERAPEUTA', idSesion: 's1' } as const;

function crearControlador() {
  const iniciarSesion = {
    ejecutar: vi.fn().mockResolvedValue({
      usuario: { idUsuario: 'u1' },
      acceso: { token: 'a', expira: new Date() },
      renovacion: { token: 'r', expira: new Date() },
    }),
  } as unknown as IniciarSesionCasoUso;
  const renovarSesion = {
    ejecutar: vi.fn().mockResolvedValue({
      acceso: { token: 'a2', expira: new Date() },
      renovacion: { token: 'r2', expira: new Date() },
    }),
  } as unknown as RenovarSesionCasoUso;
  const cerrarSesion = {
    ejecutar: vi.fn().mockResolvedValue(undefined),
  } as unknown as CerrarSesionCasoUso;
  const cerrarTodasSesiones = {
    ejecutar: vi.fn().mockResolvedValue(undefined),
  } as unknown as CerrarTodasSesionesCasoUso;
  const registrarActividad = {
    ejecutar: vi.fn().mockResolvedValue(undefined),
  } as unknown as RegistrarActividadCasoUso;
  const listarSesiones = {
    ejecutar: vi.fn().mockResolvedValue([]),
  } as unknown as ListarSesionesCasoUso;
  const aceptarInvitacion = {
    ejecutar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AceptarInvitacionCasoUso;
  const obtenerUsuarioActual = {
    ejecutar: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
  } as unknown as ObtenerUsuarioActualCasoUso;
  const cookies = {
    establecerAcceso: vi.fn(),
    establecerRenovacion: vi.fn(),
    limpiar: vi.fn(),
  } as unknown as CookiesServicio;

  const controlador = new AutenticacionController(
    iniciarSesion,
    renovarSesion,
    cerrarSesion,
    cerrarTodasSesiones,
    registrarActividad,
    listarSesiones,
    aceptarInvitacion,
    obtenerUsuarioActual,
    cookies,
  );

  return {
    controlador,
    iniciarSesion,
    renovarSesion,
    cerrarSesion,
    cerrarTodasSesiones,
    registrarActividad,
    listarSesiones,
    aceptarInvitacion,
    obtenerUsuarioActual,
    cookies,
  };
}

function resFalsa(): Response {
  return {} as Response;
}

describe('AutenticacionController', () => {
  it('iniciar sesión establece ambas cookies y devuelve el usuario público', async () => {
    const { controlador, cookies } = crearControlador();

    const respuesta = await controlador.postIniciarSesion(
      { identificador: 'a@b.com', contrasena: 'x' },
      resFalsa(),
    );

    expect(respuesta).toEqual({ usuario: { idUsuario: 'u1' } });
    expect(cookies.establecerAcceso).toHaveBeenCalledOnce();
    expect(cookies.establecerRenovacion).toHaveBeenCalledOnce();
  });

  it('aceptar invitación delega en el caso de uso', async () => {
    const { controlador, aceptarInvitacion } = crearControlador();

    const respuesta = await controlador.postAceptarInvitacion({
      token: 't',
      contrasena: '12345678',
    });

    expect(respuesta).toEqual({ estado: 'activada' });
    expect(aceptarInvitacion.ejecutar).toHaveBeenCalledWith({ token: 't', contrasena: '12345678' });
  });

  it('renovar lee la cookie de refresh y rota ambos tokens', async () => {
    const { controlador, renovarSesion, cookies } = crearControlador();
    const req = { cookies: { refresh_token: 'refresh-actual' } } as unknown as Request;

    const respuesta = await controlador.postRenovar(req, resFalsa());

    expect(respuesta).toEqual({ estado: 'ok' });
    expect(renovarSesion.ejecutar).toHaveBeenCalledWith('refresh-actual');
    expect(cookies.establecerAcceso).toHaveBeenCalledOnce();
  });

  it('renovar rechaza si no hay cookie de refresh', async () => {
    const { controlador } = crearControlador();
    const req = { cookies: {} } as unknown as Request;

    await expect(controlador.postRenovar(req, resFalsa())).rejects.toThrow(UnauthorizedException);
  });

  it('cerrar sesión revoca la sesión actual y limpia las cookies', async () => {
    const { controlador, cerrarSesion, cookies } = crearControlador();

    await controlador.postCerrarSesion(USUARIO, resFalsa());

    expect(cerrarSesion.ejecutar).toHaveBeenCalledWith('u1', 's1');
    expect(cookies.limpiar).toHaveBeenCalledOnce();
  });

  it('cerrar todas las sesiones delega y limpia las cookies', async () => {
    const { controlador, cerrarTodasSesiones, cookies } = crearControlador();

    await controlador.postCerrarSesiones(USUARIO, resFalsa());

    expect(cerrarTodasSesiones.ejecutar).toHaveBeenCalledWith('u1');
    expect(cookies.limpiar).toHaveBeenCalledOnce();
  });

  it('registrar actividad delega en el caso de uso con la sesión actual', async () => {
    const { controlador, registrarActividad } = crearControlador();

    await controlador.postActividad(USUARIO);

    expect(registrarActividad.ejecutar).toHaveBeenCalledWith('s1');
  });

  it('lista las sesiones del usuario actual', async () => {
    const { controlador, listarSesiones } = crearControlador();

    const respuesta = await controlador.getSesiones(USUARIO);

    expect(respuesta).toEqual({ data: [] });
    expect(listarSesiones.ejecutar).toHaveBeenCalledWith('u1');
  });

  it('cierra una sesión propia específica por id', async () => {
    const { controlador, cerrarSesion } = crearControlador();

    await controlador.postCerrarSesionPropia(USUARIO, 'otra-sesion');

    expect(cerrarSesion.ejecutar).toHaveBeenCalledWith('u1', 's1', 'otra-sesion');
  });

  it('devuelve el perfil público del usuario actual (restaurar sesión tras recargar)', async () => {
    const { controlador, obtenerUsuarioActual } = crearControlador();

    const respuesta = await controlador.getYo(USUARIO);

    expect(respuesta).toEqual({ usuario: { idUsuario: 'u1' } });
    expect(obtenerUsuarioActual.ejecutar).toHaveBeenCalledWith('u1');
  });
});
