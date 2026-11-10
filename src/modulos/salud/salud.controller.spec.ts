import { ServiceUnavailableException } from '@nestjs/common';
import type { PrismaService } from '../../compartido/prisma/prisma.service.js';
import { SaludController } from './salud.controller.js';

function crearControlador(queryRaw: () => Promise<unknown>): SaludController {
  return new SaludController({ $queryRaw: queryRaw } as unknown as PrismaService);
}

describe('SaludController', () => {
  it('responde ok cuando la base de datos contesta', async () => {
    const controlador = crearControlador(vi.fn().mockResolvedValue([{ '?column?': 1 }]));

    await expect(controlador.consultar()).resolves.toEqual({ estado: 'ok', baseDeDatos: 'ok' });
  });

  it('responde 503 sin exponer el error cuando la base de datos falla', async () => {
    const controlador = crearControlador(
      vi.fn().mockRejectedValue(new Error('password authentication failed')),
    );

    const error = await controlador.consultar().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as Error).message).toBe('Base de datos no disponible');
  });
});
