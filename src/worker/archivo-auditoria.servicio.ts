import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generado/prisma/client.js';
import type { Entorno } from '../configuracion/entorno.js';

/**
 * BR-038/DP-10: traslada todos los eventos a auditoria_historico y vacía la
 * tabla principal. Usa su propia conexión con DATABASE_URL_MIGRACIONES (rol
 * trazalia_migrador): trazalia_app no tiene ni USAGE sobre el esquema
 * auditoria_historico, así que el PrismaService normal de la aplicación no
 * sirve para esto — y es justamente la garantía que exige el spec ("no
 * accesible desde la aplicación").
 */
@Injectable()
export class ArchivoAuditoriaServicio implements OnModuleDestroy {
  private readonly prisma: PrismaClient;

  constructor(config: ConfigService<Entorno, true>) {
    this.prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL_MIGRACIONES', { infer: true }),
      }),
    });
  }

  /** Devuelve la cantidad de eventos trasladados. */
  async archivarSemestre(): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO auditoria_historico.eventos_auditoria
        SELECT * FROM auditoria.eventos_auditoria
      `;
      return tx.$executeRaw`DELETE FROM auditoria.eventos_auditoria`;
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
