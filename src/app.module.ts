import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validarEntorno, type Entorno } from './configuracion/entorno.js';
import { PrismaModule } from './compartido/prisma/prisma.module.js';
import { AccesoModule } from './modulos/acceso/acceso.module.js';
import { AuditoriaModule } from './modulos/auditoria/auditoria.module.js';
import { SaludModule } from './modulos/salud/salud.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }),
    // BR-035: rate limiting por IP, aplicado explícitamente con @UseGuards(ThrottlerGuard)
    // solo en las rutas públicas sensibles (no como guardia global).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Entorno, true>) => ({
        throttlers: [
          {
            ttl: config.get('RATE_LIMIT_VENTANA_SEGUNDOS', { infer: true }) * 1000,
            limit: config.get('RATE_LIMIT_MAXIMO', { infer: true }),
          },
        ],
      }),
    }),
    PrismaModule,
    SaludModule,
    AuditoriaModule,
    AccesoModule,
  ],
})
export class AppModule {}
