import type { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import { RecuperacionRepositorio } from './recuperacion.repositorio.js';

function crearRepositorio() {
  const recuperacionContrasena = {
    create: vi.fn().mockResolvedValue({ idRecuperacion: 'r1' }),
    findUnique: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(undefined),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  };
  const prisma = { recuperacionContrasena } as unknown as PrismaService;
  return { repositorio: new RecuperacionRepositorio(prisma), recuperacionContrasena };
}

describe('RecuperacionRepositorio', () => {
  it('crea la recuperación con el resumen del token, nunca el original', async () => {
    const { repositorio, recuperacionContrasena } = crearRepositorio();
    const fechaExpiracion = new Date();

    await repositorio.crear('u1', 'resumen-abc', fechaExpiracion);

    expect(recuperacionContrasena.create).toHaveBeenCalledWith({
      data: { idUsuario: 'u1', resumenToken: 'resumen-abc', fechaExpiracion },
    });
  });

  it('busca por resumen de token', async () => {
    const { repositorio, recuperacionContrasena } = crearRepositorio();

    await repositorio.buscarPorResumenToken('resumen-abc');

    expect(recuperacionContrasena.findUnique).toHaveBeenCalledWith({
      where: { resumenToken: 'resumen-abc' },
    });
  });

  it('marca la recuperación como consumida', async () => {
    const { repositorio, recuperacionContrasena } = crearRepositorio();

    await repositorio.marcarConsumida('r1');

    expect(recuperacionContrasena.update).toHaveBeenCalledWith({
      where: { idRecuperacion: 'r1' },
      data: { fechaConsumo: expect.any(Date) },
    });
  });

  it('invalida las recuperaciones vigentes de un usuario al emitir una nueva', async () => {
    const { repositorio, recuperacionContrasena } = crearRepositorio();

    await repositorio.invalidarVigentesDeUsuario('u1');

    expect(recuperacionContrasena.updateMany).toHaveBeenCalledWith({
      where: { idUsuario: 'u1', fechaConsumo: null, fechaExpiracion: { gt: expect.any(Date) } },
      data: { fechaConsumo: expect.any(Date) },
    });
  });
});
