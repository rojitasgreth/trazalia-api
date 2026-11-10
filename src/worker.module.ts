import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validarEntorno } from './configuracion/entorno.js';
import { PrismaModule } from './compartido/prisma/prisma.module.js';

/**
 * Proceso de tareas en segundo plano (Documento Cero §5): comparte código y límites
 * con la API pero no expone HTTP. Los jobs se registran aquí a medida que existan.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }), PrismaModule],
})
export class WorkerModule {}
