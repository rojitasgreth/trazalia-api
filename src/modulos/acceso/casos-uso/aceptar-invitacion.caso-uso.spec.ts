import { BadRequestException } from '@nestjs/common';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { InvitacionRepositorio } from '../repositorios/invitacion.repositorio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { AceptarInvitacionCasoUso } from './aceptar-invitacion.caso-uso.js';

function crearCasoUso(invitacion: Record<string, unknown> | null) {
  const invitaciones = {
    buscarPorResumenToken: vi.fn().mockResolvedValue(invitacion),
    marcarConsumida: vi.fn().mockResolvedValue(undefined),
  } as unknown as InvitacionRepositorio;
  const usuarios = {
    activarConContrasena: vi.fn().mockResolvedValue(undefined),
    actualizarEstado: vi.fn().mockResolvedValue(undefined),
  } as unknown as UsuarioRepositorio;
  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;

  return {
    casoUso: new AceptarInvitacionCasoUso(invitaciones, usuarios, auditoria),
    invitaciones,
    usuarios,
    auditoria,
  };
}

describe('AceptarInvitacionCasoUso', () => {
  it('activa la cuenta con una invitación vigente (AC-005/AC-006)', async () => {
    const { casoUso, usuarios, invitaciones } = crearCasoUso({
      idInvitacion: 'inv-1',
      idUsuario: 'usuario-1',
      fechaConsumo: null,
      fechaExpiracion: new Date(Date.now() + 1000 * 60 * 60),
    });

    await casoUso.ejecutar({ token: 'token-valido', contrasena: 'contraseña-nueva' });

    expect(usuarios.activarConContrasena).toHaveBeenCalledWith('usuario-1', expect.any(String));
    expect(invitaciones.marcarConsumida).toHaveBeenCalledWith('inv-1');
  });

  it('rechaza un token inexistente (AC-007)', async () => {
    const { casoUso } = crearCasoUso(null);

    await expect(casoUso.ejecutar({ token: 'no-existe', contrasena: 'x' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza una invitación ya consumida (AC-007)', async () => {
    const { casoUso } = crearCasoUso({
      idInvitacion: 'inv-1',
      idUsuario: 'usuario-1',
      fechaConsumo: new Date(),
      fechaExpiracion: new Date(Date.now() + 1000 * 60 * 60),
    });

    await expect(casoUso.ejecutar({ token: 'ya-usado', contrasena: 'x' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('suspende la cuenta al abrir una invitación vencida (BR-031)', async () => {
    const { casoUso, usuarios, auditoria } = crearCasoUso({
      idInvitacion: 'inv-1',
      idUsuario: 'usuario-1',
      fechaConsumo: null,
      fechaExpiracion: new Date(Date.now() - 1000),
    });

    await expect(casoUso.ejecutar({ token: 'vencido', contrasena: 'x' })).rejects.toThrow(
      BadRequestException,
    );
    expect(usuarios.actualizarEstado).toHaveBeenCalledWith('usuario-1', 'SUSPENDIDO');
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'invitacion_vencida' }),
    );
  });
});
