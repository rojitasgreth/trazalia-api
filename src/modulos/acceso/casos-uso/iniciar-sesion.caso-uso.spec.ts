import { UnauthorizedException } from '@nestjs/common';
import { hashearContrasena } from '../../../compartido/seguridad/contrasena.js';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { JwtServicio } from '../jwt/jwt.servicio.js';
import type { RenovacionRepositorio } from '../repositorios/renovacion.repositorio.js';
import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { IniciarSesionCasoUso } from './iniciar-sesion.caso-uso.js';

async function crearCasoUso(usuarioEncontrado: unknown) {
  const usuarios = {
    buscarPorIdentificador: vi.fn().mockResolvedValue(usuarioEncontrado),
    registrarAcceso: vi.fn().mockResolvedValue(undefined),
  } as unknown as UsuarioRepositorio;
  const sesiones = {
    crear: vi.fn().mockResolvedValue({ idSesion: 'sesion-1' }),
  } as unknown as SesionRepositorio;
  const renovaciones = {
    crear: vi.fn().mockResolvedValue({ idRegistroToken: 'r1' }),
  } as unknown as RenovacionRepositorio;
  const jwt = {
    firmarRenovacion: vi
      .fn()
      .mockResolvedValue({ token: 'refresh', jti: 'jti-r', expira: new Date() }),
    firmarAcceso: vi.fn().mockResolvedValue({ token: 'acceso', jti: 'jti-a', expira: new Date() }),
  } as unknown as JwtServicio;
  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;

  return {
    casoUso: new IniciarSesionCasoUso(usuarios, sesiones, renovaciones, jwt, auditoria),
    usuarios,
    sesiones,
    auditoria,
  };
}

describe('IniciarSesionCasoUso', () => {
  it('autentica con credenciales válidas y crea sesión y tokens (AC-008/AC-009)', async () => {
    const hash = await hashearContrasena('contraseña-correcta');
    const { casoUso, sesiones, auditoria } = await crearCasoUso({
      idUsuario: 'usuario-1',
      estado: 'ACTIVO',
      hashContrasena: hash,
      rol: 'FISIOTERAPEUTA',
      correo: 'a@b.com',
      nombreUsuario: 'V1',
      nombre: 'Ana',
      apellido: 'Pérez',
    });

    const resultado = await casoUso.ejecutar({
      identificador: 'a@b.com',
      contrasena: 'contraseña-correcta',
    });

    expect(resultado.usuario.idUsuario).toBe('usuario-1');
    expect(sesiones.crear).toHaveBeenCalledOnce();
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ resultado: 'EXITOSO' }),
    );
  });

  it('rechaza con el mismo mensaje genérico si el usuario no existe (AC-010)', async () => {
    const { casoUso } = await crearCasoUso(null);

    await expect(
      casoUso.ejecutar({ identificador: 'nadie@b.com', contrasena: 'lo-que-sea' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza si la contraseña es incorrecta', async () => {
    const hash = await hashearContrasena('la-correcta');
    const { casoUso } = await crearCasoUso({
      idUsuario: 'usuario-1',
      estado: 'ACTIVO',
      hashContrasena: hash,
      rol: 'FISIOTERAPEUTA',
    });

    await expect(
      casoUso.ejecutar({ identificador: 'a@b.com', contrasena: 'incorrecta' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it.each(['PENDIENTE', 'BLOQUEADO', 'SUSPENDIDO', 'INACTIVO'])(
    'rechaza una cuenta en estado %s aunque la contraseña sea correcta (AC-010)',
    async (estado) => {
      const hash = await hashearContrasena('correcta');
      const { casoUso } = await crearCasoUso({
        idUsuario: 'usuario-1',
        estado,
        hashContrasena: hash,
        rol: 'FISIOTERAPEUTA',
      });

      await expect(
        casoUso.ejecutar({ identificador: 'a@b.com', contrasena: 'correcta' }),
      ).rejects.toThrow(UnauthorizedException);
    },
  );
});
