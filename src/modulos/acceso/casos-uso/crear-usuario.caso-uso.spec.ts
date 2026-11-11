import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { CorreoServicio } from '../../../compartido/correo/correo.servicio.js';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { InvitacionRepositorio } from '../repositorios/invitacion.repositorio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { CrearUsuarioCasoUso } from './crear-usuario.caso-uso.js';

const CONFIG_VALORES: Record<string, string> = {
  ORIGEN_WEB: 'http://localhost:4200',
  ZONA_HORARIA_NEGOCIO: 'America/Caracas',
};

function crearCasoUso(administrador: Record<string, unknown> | null) {
  const usuarios = {
    buscarPorId: vi.fn().mockResolvedValue(administrador),
    crear: vi.fn().mockResolvedValue({
      idUsuario: 'u1',
      correo: 'nueva@b.com',
      nombre: 'Nueva',
      apellido: 'Persona',
      nombreUsuario: 'V111',
      rol: 'FISIOTERAPEUTA',
    }),
  } as unknown as UsuarioRepositorio;
  const invitaciones = {
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
    casoUso: new CrearUsuarioCasoUso(usuarios, invitaciones, correo, auditoria, config),
    usuarios,
    invitaciones,
    correo,
    auditoria,
  };
}

const COMANDO = {
  nacionalidad: 'V' as const,
  cedula: '111',
  nombre: 'Nueva',
  apellido: 'Persona',
  correo: 'nueva@b.com',
  rol: 'FISIOTERAPEUTA' as const,
};

describe('CrearUsuarioCasoUso', () => {
  it('crea el usuario, la invitación y envía el correo (flujo 7.1)', async () => {
    const { casoUso, usuarios, invitaciones, correo, auditoria } = crearCasoUso({
      idUsuario: 'admin-1',
      nombre: 'Admin',
      apellido: 'Uno',
    });

    await casoUso.ejecutar('admin-1', COMANDO);

    expect(usuarios.crear).toHaveBeenCalledWith(
      expect.objectContaining({ nombreUsuario: 'V111', correo: 'nueva@b.com' }),
    );
    expect(invitaciones.crear).toHaveBeenCalledWith(
      'u1',
      expect.any(String),
      expect.any(Date),
      'admin-1',
    );
    expect(correo.enviarInvitacion).toHaveBeenCalledWith(
      expect.objectContaining({ para: 'nueva@b.com', nombreAdmin: 'Admin Uno' }),
    );
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'creacion_usuario', idUsuarioActor: 'admin-1' }),
    );
  });

  it('rechaza si el administrador actuante no existe', async () => {
    const { casoUso } = crearCasoUso(null);

    await expect(casoUso.ejecutar('admin-1', COMANDO)).rejects.toThrow(NotFoundException);
  });

  it('traduce un conflicto de unicidad de Prisma en ConflictException (AC-003)', async () => {
    const { casoUso, usuarios } = crearCasoUso({
      idUsuario: 'admin-1',
      nombre: 'Admin',
      apellido: 'Uno',
    });
    const errorPrisma = new PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: '7.10.1',
    });
    vi.mocked(usuarios.crear).mockRejectedValue(errorPrisma);

    await expect(casoUso.ejecutar('admin-1', COMANDO)).rejects.toThrow(ConflictException);
  });
});
