import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../compartido/prisma/prisma.service.js';

@Injectable()
export class IntentoAccesoRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * BR-035: registra un fallo y limpia los que ya salieron de la ventana de
   * conteo para el mismo identificador, en la misma operación, para no
   * necesitar un job de limpieza aparte.
   */
  async registrarFallo(identificadorNormalizado: string, inicioVentana: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.intentoAcceso.deleteMany({
        where: { identificadorNormalizado, fechaIntento: { lt: inicioVentana } },
      }),
      this.prisma.intentoAcceso.create({ data: { identificadorNormalizado } }),
    ]);
  }

  async contarFallosRecientes(
    identificadorNormalizado: string,
    inicioVentana: Date,
  ): Promise<number> {
    return this.prisma.intentoAcceso.count({
      where: { identificadorNormalizado, fechaIntento: { gte: inicioVentana } },
    });
  }
}
