import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtServicio } from '../jwt/jwt.servicio.js';
import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { AutenticacionGuard, type RequestAutenticado } from './autenticacion.guard.js';

function crearContexto(cookieAcceso: unknown): { contexto: ExecutionContext; request: Request } {
  const request = { cookies: { access_token: cookieAcceso } } as unknown as Request;
  const contexto = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { contexto, request };
}

interface SesionFalsa {
  idSesion: string;
  idUsuario: string;
  fechaRevocacion: Date | null;
  ultimaActividad: Date;
}

interface UsuarioFalso {
  idUsuario: string;
  rol: string;
  estado: string;
}

const SESION_BASE: SesionFalsa = {
  idSesion: 'sesion-1',
  idUsuario: 'usuario-1',
  fechaRevocacion: null,
  ultimaActividad: new Date(),
};

const USUARIO_BASE: UsuarioFalso = {
  idUsuario: 'usuario-1',
  rol: 'FISIOTERAPEUTA',
  estado: 'ACTIVO',
};

function crearGuard(opciones: {
  verificarAcceso?: () => Promise<unknown>;
  sesion?: Partial<SesionFalsa> | null;
  usuario?: Partial<UsuarioFalso> | null;
}) {
  const jwt = {
    verificarAcceso:
      opciones.verificarAcceso ??
      (() =>
        Promise.resolve({ claims: { sub: 'usuario-1', sid: 'sesion-1', role: 'FISIOTERAPEUTA' } })),
  } as unknown as JwtServicio;
  const sesiones = {
    buscarPorId: vi
      .fn()
      .mockResolvedValue(opciones.sesion === null ? null : { ...SESION_BASE, ...opciones.sesion }),
    revocar: vi.fn().mockResolvedValue(undefined),
  } as unknown as SesionRepositorio;
  const usuarios = {
    buscarPorId: vi
      .fn()
      .mockResolvedValue(
        opciones.usuario === null ? null : { ...USUARIO_BASE, ...opciones.usuario },
      ),
  } as unknown as UsuarioRepositorio;

  return { guard: new AutenticacionGuard(jwt, sesiones, usuarios), sesiones };
}

describe('AutenticacionGuard', () => {
  it('permite el acceso con una cookie, sesión y cuenta válidas', async () => {
    const { guard } = crearGuard({});
    const { contexto, request } = crearContexto('token-valido');

    await expect(guard.canActivate(contexto)).resolves.toBe(true);
    expect((request as RequestAutenticado).usuarioAutenticado).toEqual({
      idUsuario: 'usuario-1',
      rol: 'FISIOTERAPEUTA',
      idSesion: 'sesion-1',
    });
  });

  it('rechaza sin cookie de acceso', async () => {
    const { guard } = crearGuard({});
    const { contexto } = crearContexto(undefined);

    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza si el JWT no verifica', async () => {
    const { guard } = crearGuard({
      verificarAcceso: () => Promise.reject(new Error('firma inválida')),
    });
    const { contexto } = crearContexto('token-malo');

    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza si la sesión no existe', async () => {
    const { guard } = crearGuard({ sesion: null });
    const { contexto } = crearContexto('token-valido');

    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza si la sesión ya fue revocada', async () => {
    const { guard } = crearGuard({ sesion: { fechaRevocacion: new Date() } });
    const { contexto } = crearContexto('token-valido');

    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });

  it('revoca y rechaza si la sesión expiró por inactividad (AC-021)', async () => {
    const haceDosHoras = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const { guard, sesiones } = crearGuard({ sesion: { ultimaActividad: haceDosHoras } });
    const { contexto } = crearContexto('token-valido');

    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
    expect(sesiones.revocar).toHaveBeenCalledWith('sesion-1', 'inactividad');
  });

  it('rechaza si la cuenta ya no está ACTIVA', async () => {
    const { guard } = crearGuard({ usuario: { estado: 'SUSPENDIDO' } });
    const { contexto } = crearContexto('token-valido');

    await expect(guard.canActivate(contexto)).rejects.toThrow(UnauthorizedException);
  });
});
