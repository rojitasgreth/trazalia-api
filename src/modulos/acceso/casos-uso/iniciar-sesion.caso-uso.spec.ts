import { HttpException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { hashearContrasena } from '../../../compartido/seguridad/contrasena.js';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { JwtServicio } from '../jwt/jwt.servicio.js';
import type { IntentoAccesoRepositorio } from '../repositorios/intento-acceso.repositorio.js';
import type { RenovacionRepositorio } from '../repositorios/renovacion.repositorio.js';
import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { IniciarSesionCasoUso } from './iniciar-sesion.caso-uso.js';

const CONFIG_VALORES: Record<string, number> = {
  BLOQUEO_UMBRAL_INTENTOS: 3,
  BLOQUEO_VENTANA_MINUTOS: 15,
  BLOQUEO_DURACION_MINUTOS: 15,
};

function crearCasoUso(usuarioEncontrado: unknown, fallosRecientes = 0) {
  const usuarios = {
    buscarPorIdentificador: vi.fn().mockResolvedValue(usuarioEncontrado),
    registrarAcceso: vi.fn().mockResolvedValue(undefined),
    desbloquear: vi.fn().mockResolvedValue(undefined),
    bloquear: vi.fn().mockResolvedValue(undefined),
  } as unknown as UsuarioRepositorio;
  const sesiones = {
    crear: vi.fn().mockResolvedValue({ idSesion: 'sesion-1' }),
  } as unknown as SesionRepositorio;
  const renovaciones = {
    crear: vi.fn().mockResolvedValue({ idRegistroToken: 'r1' }),
  } as unknown as RenovacionRepositorio;
  const intentos = {
    registrarFallo: vi.fn().mockResolvedValue(undefined),
    contarFallosRecientes: vi.fn().mockResolvedValue(fallosRecientes),
  } as unknown as IntentoAccesoRepositorio;
  const jwt = {
    firmarRenovacion: vi
      .fn()
      .mockResolvedValue({ token: 'refresh', jti: 'jti-r', expira: new Date() }),
    firmarAcceso: vi.fn().mockResolvedValue({ token: 'acceso', jti: 'jti-a', expira: new Date() }),
  } as unknown as JwtServicio;
  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;
  const config = {
    get: (clave: string) => CONFIG_VALORES[clave],
  } as unknown as ConfigService<never, true>;

  return {
    casoUso: new IniciarSesionCasoUso(
      usuarios,
      sesiones,
      renovaciones,
      intentos,
      jwt,
      auditoria,
      config,
    ),
    usuarios,
    sesiones,
    intentos,
    auditoria,
  };
}

describe('IniciarSesionCasoUso', () => {
  it('autentica con credenciales válidas y crea sesión y tokens (AC-008/AC-009)', async () => {
    const hash = await hashearContrasena('contraseña-correcta');
    const { casoUso, sesiones, auditoria } = crearCasoUso({
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
    const { casoUso } = crearCasoUso(null);

    await expect(
      casoUso.ejecutar({ identificador: 'nadie@b.com', contrasena: 'lo-que-sea' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza si la contraseña es incorrecta', async () => {
    const hash = await hashearContrasena('la-correcta');
    const { casoUso } = crearCasoUso({
      idUsuario: 'usuario-1',
      estado: 'ACTIVO',
      hashContrasena: hash,
      rol: 'FISIOTERAPEUTA',
    });

    await expect(
      casoUso.ejecutar({ identificador: 'a@b.com', contrasena: 'incorrecta' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it.each(['PENDIENTE', 'SUSPENDIDO', 'INACTIVO'])(
    'rechaza una cuenta en estado %s aunque la contraseña sea correcta (AC-010)',
    async (estado) => {
      const hash = await hashearContrasena('correcta');
      const { casoUso } = crearCasoUso({
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

  it('rechaza con 423 una cuenta BLOQUEADA vigente, sin verificar la contraseña', async () => {
    const { casoUso, usuarios, intentos } = crearCasoUso({
      idUsuario: 'usuario-1',
      estado: 'BLOQUEADO',
      bloqueadoHasta: new Date(Date.now() + 60_000),
      hashContrasena: 'hash-cualquiera',
      rol: 'FISIOTERAPEUTA',
    });

    await expect(
      casoUso.ejecutar({ identificador: 'a@b.com', contrasena: 'lo-que-sea' }),
    ).rejects.toMatchObject({ status: 423 });
    expect(usuarios.desbloquear).not.toHaveBeenCalled();
    expect(intentos.registrarFallo).not.toHaveBeenCalled();
  });

  it('BR-035: se desbloquea automáticamente cuando el plazo ya venció y la contraseña es correcta', async () => {
    const hash = await hashearContrasena('correcta');
    const { casoUso, usuarios, sesiones } = crearCasoUso({
      idUsuario: 'usuario-1',
      estado: 'BLOQUEADO',
      bloqueadoHasta: new Date(Date.now() - 1000),
      hashContrasena: hash,
      rol: 'FISIOTERAPEUTA',
      correo: 'a@b.com',
      nombreUsuario: 'V1',
      nombre: 'Ana',
      apellido: 'Pérez',
    });

    const resultado = await casoUso.ejecutar({ identificador: 'a@b.com', contrasena: 'correcta' });

    expect(usuarios.desbloquear).toHaveBeenCalledWith('usuario-1');
    expect(resultado.usuario.idUsuario).toBe('usuario-1');
    expect(sesiones.crear).toHaveBeenCalledOnce();
  });

  it('AC-025: bloquea la cuenta al cruzar el umbral de intentos fallidos', async () => {
    const hash = await hashearContrasena('la-correcta');
    const { casoUso, usuarios, auditoria } = crearCasoUso(
      { idUsuario: 'usuario-1', estado: 'ACTIVO', hashContrasena: hash, rol: 'FISIOTERAPEUTA' },
      3,
    );

    await expect(
      casoUso.ejecutar({ identificador: 'a@b.com', contrasena: 'incorrecta' }),
    ).rejects.toMatchObject({ status: 423 });
    expect(usuarios.bloquear).toHaveBeenCalledWith('usuario-1', expect.any(Date));
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'bloqueo' }),
    );
  });

  it('AC-035: un identificador sin cuenta también recibe la respuesta de bloqueo al cruzar el umbral', async () => {
    const { casoUso, usuarios } = crearCasoUso(null, 3);

    await expect(
      casoUso.ejecutar({ identificador: 'nadie@b.com', contrasena: 'x' }),
    ).rejects.toMatchObject({ status: 423 });
    expect(usuarios.bloquear).not.toHaveBeenCalled();
  });

  it('no bloquea una cuenta ya SUSPENDIDA aunque cruce el umbral (no sobreescribe el estado administrativo)', async () => {
    const { casoUso, usuarios } = crearCasoUso(
      {
        idUsuario: 'usuario-1',
        estado: 'SUSPENDIDO',
        hashContrasena: 'hash',
        rol: 'FISIOTERAPEUTA',
      },
      3,
    );

    await expect(
      casoUso.ejecutar({ identificador: 'a@b.com', contrasena: 'x' }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(usuarios.bloquear).not.toHaveBeenCalled();
  });
});
