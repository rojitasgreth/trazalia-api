import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validarEntorno } from './configuracion/entorno.js';
import { PrismaModule } from './compartido/prisma/prisma.module.js';
import { AccesoModule } from './modulos/acceso/acceso.module.js';
import { AuditoriaModule } from './modulos/auditoria/auditoria.module.js';
import { SaludModule } from './modulos/salud/salud.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }),
    PrismaModule,
    SaludModule,
    AuditoriaModule,
    AccesoModule,
  ],
})
export class AppModule {}
