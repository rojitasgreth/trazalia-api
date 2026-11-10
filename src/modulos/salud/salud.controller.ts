import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../compartido/prisma/prisma.service.js';

export interface EstadoSalud {
  estado: 'ok';
  baseDeDatos: 'ok';
}

@Controller('salud')
export class SaludController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async consultar(): Promise<EstadoSalud> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Base de datos no disponible');
    }
    return { estado: 'ok', baseDeDatos: 'ok' };
  }
}
