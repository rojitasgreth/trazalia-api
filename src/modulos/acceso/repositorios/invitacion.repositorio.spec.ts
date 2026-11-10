import type { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import { InvitacionRepositorio } from './invitacion.repositorio.js';

function crearRepositorio() {
  const invitacionUsuario = {
    create: vi.fn().mockResolvedValue({ idInvitacion: 'i1' }),
    findUnique: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
  };
  const prisma = { invitacionUsuario } as unknown as PrismaService;
  return { repositorio: new InvitacionRepositorio(prisma), invitacionUsuario };
}

describe('InvitacionRepositorio', () => {
  it('crea la invitación con el resumen del token, nunca el original', async () => {
    const { repositorio, invitacionUsuario } = crearRepositorio();
    const fechaExpiracion = new Date();

    await repositorio.crear('u1', 'resumen-abc', fechaExpiracion, 'admin-1');

    expect(invitacionUsuario.create).toHaveBeenCalledWith({
      data: {
        idUsuario: 'u1',
        resumenToken: 'resumen-abc',
        fechaExpiracion,
        idAdministradorCreador: 'admin-1',
      },
    });
  });

  it('marca la invitación como consumida', async () => {
    const { repositorio, invitacionUsuario } = crearRepositorio();

    await repositorio.marcarConsumida('i1');

    expect(invitacionUsuario.update).toHaveBeenCalledWith({
      where: { idInvitacion: 'i1' },
      data: { fechaConsumo: expect.any(Date) },
    });
  });
});
