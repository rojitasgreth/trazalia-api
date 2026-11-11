import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { InvitacionRepositorio } from '../repositorios/invitacion.repositorio.js';
import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { ActualizarUsuarioCasoUso } from './actualizar-usuario.caso-uso.js';

function usuarioBase(extra: Record<string, unknown> = {}) {
  return {
    idUsuario: 'u1',
    correo: 'viejo@b.com',
    rol: 'FISIOTERAPEUTA',
    estado: 'ACTIVO',
    nombre: 'A',
    apellido: 'B',
    nombreUsuario: 'V1',
    ...extra,
  };
}

function crearCasoUso(
  usuario: Record<string, unknown> | null,
  vigente: Record<string, unknown> | null = null,
) {
  const usuarios = {
    buscarPorId: vi.fn().mockResolvedValue(usuario),
    actualizarDatos: vi.fn().mockResolvedValue(undefined),
    cambiarRolProtegido: vi.fn().mockResolvedValue({ ok: true }),
  } as unknown as UsuarioRepositorio;
  const invitaciones = {
    buscarVigentePorUsuario: vi.fn().mockResolvedValue(vigente),
    invalidar: vi.fn().mockResolvedValue(undefined),
  } as unknown as InvitacionRepositorio;
  const sesiones = {
    revocarTodasDeUsuario: vi.fn().mockResolvedValue(undefined),
  } as unknown as SesionRepositorio;
  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;

  return {
    casoUso: new ActualizarUsuarioCasoUso(usuarios, invitaciones, sesiones, auditoria),
    usuarios,
    invitaciones,
    sesiones,
    auditoria,
  };
}

describe('ActualizarUsuarioCasoUso', () => {
  it('actualiza campos básicos y audita "edicion_usuario"', async () => {
    const { casoUso, usuarios, auditoria } = crearCasoUso(usuarioBase());

    await casoUso.ejecutar('admin-1', 'u1', { nombre: 'Nuevo' });

    expect(usuarios.actualizarDatos).toHaveBeenCalledWith('u1', { nombre: 'Nuevo' });
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'edicion_usuario' }),
    );
  });

  it('invalida la invitación vigente si cambia el correo (BR-034)', async () => {
    const { casoUso, invitaciones } = crearCasoUso(usuarioBase({ estado: 'PENDIENTE' }), {
      idInvitacion: 'inv-1',
    });

    await casoUso.ejecutar('admin-1', 'u1', { correo: 'nuevo@b.com' });

    expect(invitaciones.invalidar).toHaveBeenCalledWith('inv-1');
  });

  it('no invalida ninguna invitación si el correo no cambia realmente', async () => {
    const { casoUso, invitaciones } = crearCasoUso(usuarioBase());

    await casoUso.ejecutar('admin-1', 'u1', { correo: 'VIEJO@B.com' });

    expect(invitaciones.buscarVigentePorUsuario).not.toHaveBeenCalled();
  });

  it('rechaza que un administrador cambie su propio rol (BR-033)', async () => {
    const { casoUso } = crearCasoUso(usuarioBase({ idUsuario: 'admin-1', rol: 'ADMINISTRADOR' }));

    await expect(casoUso.ejecutar('admin-1', 'admin-1', { rol: 'FISIOTERAPEUTA' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rechaza quitarle el rol al último administrador activo (BR-033)', async () => {
    const { casoUso, usuarios } = crearCasoUso(usuarioBase({ rol: 'ADMINISTRADOR' }));
    vi.mocked(usuarios.cambiarRolProtegido).mockResolvedValue({ ok: false });

    await expect(casoUso.ejecutar('admin-1', 'u1', { rol: 'FISIOTERAPEUTA' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('cambia el rol, revoca sesiones y audita "cambio_rol" (BR-030)', async () => {
    const { casoUso, usuarios, sesiones, auditoria } = crearCasoUso(
      usuarioBase({ rol: 'ADMINISTRADOR' }),
    );

    await casoUso.ejecutar('admin-1', 'u1', { rol: 'FISIOTERAPEUTA' });

    expect(usuarios.cambiarRolProtegido).toHaveBeenCalledWith('u1', 'FISIOTERAPEUTA');
    expect(sesiones.revocarTodasDeUsuario).toHaveBeenCalledWith('u1', 'cambio_rol');
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoEvento: 'cambio_rol',
        metadatosMinimos: { rolAnterior: 'ADMINISTRADOR', rolNuevo: 'FISIOTERAPEUTA' },
      }),
    );
  });

  it('traduce un conflicto de unicidad de correo en ConflictException', async () => {
    const { casoUso, usuarios } = crearCasoUso(usuarioBase());
    vi.mocked(usuarios.actualizarDatos).mockRejectedValue(
      new PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '7.10.1',
      }),
    );

    await expect(casoUso.ejecutar('admin-1', 'u1', { correo: 'otro@b.com' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('lanza NotFoundException si el usuario no existe', async () => {
    const { casoUso } = crearCasoUso(null);

    await expect(casoUso.ejecutar('admin-1', 'u1', { nombre: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
