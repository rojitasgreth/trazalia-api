import { UnauthorizedException } from '@nestjs/common';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { JwtServicio } from '../jwt/jwt.servicio.js';
import type { RenovacionRepositorio } from '../repositorios/renovacion.repositorio.js';
import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { RenovarSesionCasoUso } from './renovar-sesion.caso-uso.js';

const CLAIMS_BASE = { sub: 'usuario-1', sid: 'sesion-1' };

function crearCasoUso(opciones: {
  registro?: Record<string, unknown> | null;
  sesion?: Record<string, unknown> | null;
  usuario?: Record<string, unknown> | null;
}) {
  const jwt = {
    verificarRenovacion: vi
      .fn()
      .mockResolvedValue({ claims: CLAIMS_BASE, jti: 'jti-actual', expira: new Date() }),
    firmarRenovacion: vi
      .fn()
      .mockResolvedValue({ token: 'nuevo-refresh', jti: 'jti-nuevo', expira: new Date() }),
    firmarAcceso: vi
      .fn()
      .mockResolvedValue({ token: 'nuevo-acceso', jti: 'jti-a', expira: new Date() }),
  } as unknown as JwtServicio;

  const registroPorDefecto = {
    idRegistroToken: 'r-actual',
    idSesion: 'sesion-1',
    fechaConsumo: null,
    fechaRevocacion: null,
    fechaExpiracion: new Date(Date.now() + 1000 * 60 * 60),
  };
  const sesionPorDefecto = {
    idSesion: 'sesion-1',
    idUsuario: 'usuario-1',
    fechaRevocacion: null,
    ultimaActividad: new Date(),
  };

  const renovaciones = {
    buscarPorResumenJti: vi
      .fn()
      .mockResolvedValue(
        opciones.registro === null ? null : { ...registroPorDefecto, ...opciones.registro },
      ),
    revocarFamiliaDeSesion: vi.fn().mockResolvedValue(undefined),
    crear: vi.fn().mockResolvedValue({ idRegistroToken: 'r-nuevo' }),
    marcarConsumidoYReemplazado: vi.fn().mockResolvedValue(undefined),
  } as unknown as RenovacionRepositorio;

  const sesiones = {
    buscarPorId: vi
      .fn()
      .mockResolvedValue(
        opciones.sesion === null ? null : { ...sesionPorDefecto, ...opciones.sesion },
      ),
    revocar: vi.fn().mockResolvedValue(undefined),
    actualizarJtiRefresh: vi.fn().mockResolvedValue(undefined),
  } as unknown as SesionRepositorio;

  const usuarios = {
    buscarPorId: vi.fn().mockResolvedValue(
      opciones.usuario === null
        ? null
        : {
            idUsuario: 'usuario-1',
            estado: 'ACTIVO',
            rol: 'FISIOTERAPEUTA',
            ...opciones.usuario,
          },
    ),
  } as unknown as UsuarioRepositorio;

  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;

  return {
    casoUso: new RenovarSesionCasoUso(jwt, sesiones, renovaciones, usuarios, auditoria),
    sesiones,
    renovaciones,
    auditoria,
  };
}

describe('RenovarSesionCasoUso', () => {
  it('rota el refresh token en una renovación válida (AC-016)', async () => {
    const { casoUso, renovaciones } = crearCasoUso({});

    const resultado = await casoUso.ejecutar('refresh-valido');

    expect(resultado.renovacion.token).toBe('nuevo-refresh');
    expect(renovaciones.marcarConsumidoYReemplazado).toHaveBeenCalledWith('r-actual', 'r-nuevo');
  });

  it('detecta reutilización de un refresh ya consumido y revoca la familia (AC-017)', async () => {
    const { casoUso, renovaciones, sesiones, auditoria } = crearCasoUso({
      registro: { fechaConsumo: new Date() },
    });

    await expect(casoUso.ejecutar('refresh-reutilizado')).rejects.toThrow(UnauthorizedException);
    expect(renovaciones.revocarFamiliaDeSesion).toHaveBeenCalledWith('sesion-1');
    expect(sesiones.revocar).toHaveBeenCalledWith('sesion-1', 'reutilizacion_refresh');
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ resultado: 'REUTILIZACION_DETECTADA' }),
    );
  });

  it('detecta reutilización de un refresh ya revocado', async () => {
    const { casoUso, renovaciones } = crearCasoUso({ registro: { fechaRevocacion: new Date() } });

    await expect(casoUso.ejecutar('refresh-revocado')).rejects.toThrow(UnauthorizedException);
    expect(renovaciones.revocarFamiliaDeSesion).toHaveBeenCalled();
  });

  it('rechaza si el registro de renovación no existe', async () => {
    const { casoUso } = crearCasoUso({ registro: null });

    await expect(casoUso.ejecutar('refresh-desconocido')).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza y revoca si la sesión ya expiró por inactividad', async () => {
    const haceDosHoras = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const { casoUso, sesiones } = crearCasoUso({ sesion: { ultimaActividad: haceDosHoras } });

    await expect(casoUso.ejecutar('refresh-valido')).rejects.toThrow(UnauthorizedException);
    expect(sesiones.revocar).toHaveBeenCalledWith('sesion-1', 'inactividad');
  });

  it('rechaza si la cuenta ya no está activa (AC-028)', async () => {
    const { casoUso, sesiones } = crearCasoUso({ usuario: { estado: 'SUSPENDIDO' } });

    await expect(casoUso.ejecutar('refresh-valido')).rejects.toThrow(UnauthorizedException);
    expect(sesiones.revocar).toHaveBeenCalledWith('sesion-1', 'cuenta_no_activa');
  });
});
