import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { validarEntorno } from './configuracion/entorno.js';
import { ArchivoAuditoriaJob } from './worker/archivo-auditoria.job.js';
import { ArchivoAuditoriaServicio } from './worker/archivo-auditoria.servicio.js';

/**
 * Proceso de tareas en segundo plano (Documento Cero §5): comparte código y límites
 * con la API pero no expone HTTP. Los jobs se registran aquí a medida que existan.
 *
 * No importa PrismaModule: ese usa DATABASE_URL (rol trazalia_app, sin
 * acceso a auditoria_historico). Los jobs que necesiten tocarla abren su
 * propia conexión con el rol que corresponda (ver ArchivoAuditoriaServicio).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }),
    ScheduleModule.forRoot(),
  ],
  providers: [ArchivoAuditoriaServicio, ArchivoAuditoriaJob],
})
export class WorkerModule {}
