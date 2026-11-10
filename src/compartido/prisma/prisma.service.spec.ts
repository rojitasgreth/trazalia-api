import type { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  it('se desconecta al destruirse el módulo', async () => {
    const config = {
      get: () => 'postgresql://usuario:clave@localhost:5432/trazalia',
    } as unknown as ConfigService<never, true>;
    const servicio = new PrismaService(config);
    servicio.$disconnect = vi.fn().mockResolvedValue(undefined);

    await servicio.onModuleDestroy();

    expect(servicio.$disconnect).toHaveBeenCalledOnce();
  });
});
