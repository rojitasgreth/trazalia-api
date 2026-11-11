import { BadRequestException } from '@nestjs/common';
import type { CorreoServicio } from '../../../compartido/correo/correo.servicio.js';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { RecuperacionRepositorio } from '../repositorios/recuperacion.repositorio.js';
import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { RestablecerContrasenaCasoUso } from './restablecer-contrasena.caso-uso.js';

function crearCasoUso(recuperacion: Record<string, unknown> | null) {
  const recuperaciones = {
    buscarPorResumenToken: vi.fn().mockResolvedValue(recuperacion),
    marcarConsumida: vi.fn().mockResolvedValue(undefined),
  } as unknown as RecuperacionRepositorio;
  const usuarios = {
    actualizarContrasena: vi.fn().mockResolvedValue({
      idUsuario: 'u1',
      correo: 'ana@b.com',
      nombre: 'Ana',
      nombreUsuario: 'V1',
    }),
  } as unknown as UsuarioRepositorio;
  const sesiones = {
    revocarTodasDeUsuario: vi.fn().mockResolvedValue(undefined),
  } as unknown as SesionRepositorio;
  const correo = {
    enviarContrasenaCambiada: vi.fn().mockResolvedValue(undefined),
  } as unknown as CorreoServicio;
  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;

  return {
    casoUso: new RestablecerContrasenaCasoUso(
      recuperaciones,
      usuarios,
      sesiones,
      correo,
      auditoria,
    ),
    recuperaciones,
    usuarios,
    sesiones,
    correo,
    auditoria,
  };
}

describe('RestablecerContrasenaCasoUso', () => {
  it('restablece la contraseña, revoca sesiones y notifica por correo (AC-013)', async () => {
    const { casoUso, usuarios, recuperaciones, sesiones, correo, auditoria } = crearCasoUso({
      idRecuperacion: 'r1',
      idUsuario: 'u1',
      fechaConsumo: null,
      fechaExpiracion: new Date(Date.now() + 1000 * 60),
    });

    await casoUso.ejecutar({ token: 'token-valido', contrasena: 'contraseña-nueva' });

    expect(usuarios.actualizarContrasena).toHaveBeenCalledWith('u1', expect.any(String));
    expect(recuperaciones.marcarConsumida).toHaveBeenCalledWith('r1');
    expect(sesiones.revocarTodasDeUsuario).toHaveBeenCalledWith('u1', 'cambio_contrasena');
    expect(correo.enviarContrasenaCambiada).toHaveBeenCalledWith(
      expect.objectContaining({ para: 'ana@b.com' }),
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'cambio_contrasena' }),
    );
  });

  it('rechaza un token inexistente', async () => {
    const { casoUso } = crearCasoUso(null);

    await expect(casoUso.ejecutar({ token: 'no-existe', contrasena: 'x' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza una recuperación ya consumida', async () => {
    const { casoUso } = crearCasoUso({
      idRecuperacion: 'r1',
      idUsuario: 'u1',
      fechaConsumo: new Date(),
      fechaExpiracion: new Date(Date.now() + 1000 * 60),
    });

    await expect(casoUso.ejecutar({ token: 'ya-usado', contrasena: 'x' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza un enlace vencido', async () => {
    const { casoUso, usuarios } = crearCasoUso({
      idRecuperacion: 'r1',
      idUsuario: 'u1',
      fechaConsumo: null,
      fechaExpiracion: new Date(Date.now() - 1000),
    });

    await expect(casoUso.ejecutar({ token: 'vencido', contrasena: 'x' })).rejects.toThrow(
      BadRequestException,
    );
    expect(usuarios.actualizarContrasena).not.toHaveBeenCalled();
  });
});
