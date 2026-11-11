import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { CorreoServicio } from '../../../compartido/correo/correo.servicio.js';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { InvitacionRepositorio } from '../repositorios/invitacion.repositorio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { ReenviarInvitacionCasoUso } from './reenviar-invitacion.caso-uso.js';

const CONFIG_VALORES: Record<string, string> = {
  ORIGEN_WEB: 'http://localhost:4200',
  ZONA_HORARIA_NEGOCIO: 'America/Caracas',
};

function crearCasoUso(
  usuario: Record<string, unknown> | null,
  vigente: Record<string, unknown> | null = null,
) {
  const usuarios = {
    buscarPorId: vi.fn((id: string) =>
      Promise.resolve(
        id === 'admin-1' ? { idUsuario: 'admin-1', nombre: 'Admin', apellido: 'Uno' } : usuario,
      ),
    ),
    actualizarEstado: vi.fn().mockResolvedValue(undefined),
  } as unknown as UsuarioRepositorio;
  const invitaciones = {
    buscarVigentePorUsuario: vi.fn().mockResolvedValue(vigente),
    invalidar: vi.fn().mockResolvedValue(undefined),
    crear: vi.fn().mockResolvedValue(undefined),
  } as unknown as InvitacionRepositorio;
  const correo = {
    enviarInvitacion: vi.fn().mockResolvedValue(undefined),
  } as unknown as CorreoServicio;
  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;
  const config = { get: (clave: string) => CONFIG_VALORES[clave] } as unknown as ConfigService<
    never,
    true
  >;

  return {
    casoUso: new ReenviarInvitacionCasoUso(usuarios, invitaciones, correo, auditoria, config),
    usuarios,
    invitaciones,
    correo,
  };
}

describe('ReenviarInvitacionCasoUso', () => {
  it('reenvía sobre una cuenta PENDIENTE e invalida la invitación vigente (AC-032)', async () => {
    const { casoUso, invitaciones, correo } = crearCasoUso(
      {
        idUsuario: 'u1',
        estado: 'PENDIENTE',
        fechaActivacion: null,
        correo: 'a@b.com',
        nombre: 'A',
        nombreUsuario: 'V1',
      },
      { idInvitacion: 'inv-vieja' },
    );

    await casoUso.ejecutar('admin-1', 'u1');

    expect(invitaciones.invalidar).toHaveBeenCalledWith('inv-vieja');
    expect(invitaciones.crear).toHaveBeenCalledWith(
      'u1',
      expect.any(String),
      expect.any(Date),
      'admin-1',
    );
    expect(correo.enviarInvitacion).toHaveBeenCalledOnce();
  });

  it('reenvía sobre una SUSPENDIDA que nunca se activó y la vuelve a PENDIENTE (Q5)', async () => {
    const { casoUso, usuarios } = crearCasoUso({
      idUsuario: 'u1',
      estado: 'SUSPENDIDO',
      fechaActivacion: null,
      correo: 'a@b.com',
      nombre: 'A',
      nombreUsuario: 'V1',
    });

    await casoUso.ejecutar('admin-1', 'u1');

    expect(usuarios.actualizarEstado).toHaveBeenCalledWith('u1', 'PENDIENTE');
  });

  it('rechaza reenviar sobre una cuenta ACTIVA', async () => {
    const { casoUso } = crearCasoUso({
      idUsuario: 'u1',
      estado: 'ACTIVO',
      fechaActivacion: new Date(),
      correo: 'a@b.com',
      nombre: 'A',
      nombreUsuario: 'V1',
    });

    await expect(casoUso.ejecutar('admin-1', 'u1')).rejects.toThrow(BadRequestException);
  });

  it('rechaza reenviar sobre una SUSPENDIDA que sí llegó a activarse', async () => {
    const { casoUso } = crearCasoUso({
      idUsuario: 'u1',
      estado: 'SUSPENDIDO',
      fechaActivacion: new Date(),
      correo: 'a@b.com',
      nombre: 'A',
      nombreUsuario: 'V1',
    });

    await expect(casoUso.ejecutar('admin-1', 'u1')).rejects.toThrow(BadRequestException);
  });

  it('rechaza si el usuario no existe', async () => {
    const { casoUso } = crearCasoUso(null);

    await expect(casoUso.ejecutar('admin-1', 'u1')).rejects.toThrow(NotFoundException);
  });
});
