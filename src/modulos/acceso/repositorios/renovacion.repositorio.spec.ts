import type { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import { RenovacionRepositorio } from './renovacion.repositorio.js';

function crearRepositorio() {
  const registroTokenRenovacion = {
    create: vi.fn().mockResolvedValue({ idRegistroToken: 'r1' }),
    findUnique: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
    updateMany: vi.fn().mockResolvedValue(undefined),
  };
  const prisma = { registroTokenRenovacion } as unknown as PrismaService;
  return { repositorio: new RenovacionRepositorio(prisma), registroTokenRenovacion };
}

describe('RenovacionRepositorio', () => {
  it('marca el registro actual como consumido y enlaza el reemplazo (AC-016)', async () => {
    const { repositorio, registroTokenRenovacion } = crearRepositorio();

    await repositorio.marcarConsumidoYReemplazado('r1', 'r2');

    expect(registroTokenRenovacion.update).toHaveBeenCalledWith({
      where: { idRegistroToken: 'r1' },
      data: { fechaConsumo: expect.any(Date), reemplazadoPorId: 'r2' },
    });
  });

  it('revoca toda la familia de tokens de una sesión (AC-017)', async () => {
    const { repositorio, registroTokenRenovacion } = crearRepositorio();

    await repositorio.revocarFamiliaDeSesion('s1');

    expect(registroTokenRenovacion.updateMany).toHaveBeenCalledWith({
      where: { idSesion: 's1', fechaRevocacion: null },
      data: { fechaRevocacion: expect.any(Date) },
    });
  });
});
