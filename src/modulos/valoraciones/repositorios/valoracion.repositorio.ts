import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import type { Prisma, Valoracion } from '../../../generado/prisma/client.js';
import type { TipoHistoria } from '../../../generado/prisma/enums.js';
import type { Contenido } from '../dominio/contenido.js';
import type { DatosDeLaFicha } from '../dominio/datos-de-la-ficha.js';

export interface NuevaValoracion {
  idHistoria: string;
  idFisioterapeuta: string;
  nombreFisioterapeuta: string;
  tipo: TipoHistoria;
  versionFicha: number;
  contenido: Contenido;
}

export type TransaccionFinalizar = Prisma.TransactionClient;

// Todas las lecturas y escrituras filtran por el fisioterapeuta propietario
// (SPEC C RF-C17): no existe acceso a una valoración sin propietario.
@Injectable()
export class ValoracionRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorHistoria(
    idFisioterapeuta: string,
    idHistoria: string,
  ): Promise<Valoracion | null> {
    return this.prisma.valoracion.findFirst({ where: { idFisioterapeuta, idHistoria } });
  }

  /** RF-C02: la restricción única sobre id_historia impide una segunda valoración. */
  async crear(datos: NuevaValoracion): Promise<Valoracion> {
    return this.prisma.valoracion.create({
      data: { ...datos, contenido: datos.contenido as Prisma.InputJsonObject },
    });
  }

  /**
   * SPEC C §13: guarda solo si nadie guardó desde la versión que tenía el
   * cliente y la valoración sigue En curso. Devuelve la valoración guardada o
   * null si no se cumplió alguna de las dos condiciones.
   */
  async guardar(
    idFisioterapeuta: string,
    idValoracion: string,
    versionEsperada: number,
    contenido: Contenido,
  ): Promise<Valoracion | null> {
    const { count } = await this.prisma.valoracion.updateMany({
      where: { idValoracion, idFisioterapeuta, version: versionEsperada, estado: 'EN_CURSO' },
      data: { contenido: contenido as Prisma.InputJsonObject, version: { increment: 1 } },
    });
    return count === 0 ? null : this.prisma.valoracion.findUnique({ where: { idValoracion } });
  }

  /**
   * RF-C13: finaliza con la foto de los datos personales y ejecuta `ademas`
   * (historia a Activa y auditoría) en la misma transacción. Devuelve null si
   * la versión cambió o ya estaba finalizada; en ese caso no se modifica nada.
   */
  async finalizar(
    idFisioterapeuta: string,
    idValoracion: string,
    versionEsperada: number,
    datosPersonales: DatosDeLaFicha,
    ademas: (tx: TransaccionFinalizar) => Promise<void>,
  ): Promise<Valoracion | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.valoracion.updateMany({
        where: { idValoracion, idFisioterapeuta, version: versionEsperada, estado: 'EN_CURSO' },
        data: {
          estado: 'FINALIZADA',
          fechaFinalizacion: new Date(),
          datosPersonales: datosPersonales as unknown as Prisma.InputJsonObject,
          version: { increment: 1 },
        },
      });
      if (count === 0) return null;
      await ademas(tx);
      return tx.valoracion.findUnique({ where: { idValoracion } });
    });
  }
}
