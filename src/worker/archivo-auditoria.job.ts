import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import type { Entorno } from '../configuracion/entorno.js';
import { ArchivoAuditoriaServicio } from './archivo-auditoria.servicio.js';

const NOMBRE_JOB = 'archivo-auditoria-semestral';
// BR-038: el 1 de enero y el 1 de julio a las 00:00.
const EXPRESION_CRON_SEMESTRAL = '0 0 0 1 1,7 *';

@Injectable()
export class ArchivoAuditoriaJob implements OnModuleInit {
  private readonly logger = new Logger(ArchivoAuditoriaJob.name);

  constructor(
    private readonly archivo: ArchivoAuditoriaServicio,
    private readonly scheduler: SchedulerRegistry,
    private readonly config: ConfigService<Entorno, true>,
  ) {}

  onModuleInit(): void {
    const job = new CronJob(
      EXPRESION_CRON_SEMESTRAL,
      () => void this.ejecutar(),
      null,
      true,
      this.config.get('ZONA_HORARIA_NEGOCIO', { infer: true }),
    );
    this.scheduler.addCronJob(NOMBRE_JOB, job);
    this.logger.log(`Job "${NOMBRE_JOB}" programado (${EXPRESION_CRON_SEMESTRAL}).`);
  }

  private async ejecutar(): Promise<void> {
    try {
      const trasladados = await this.archivo.archivarSemestre();
      this.logger.log(`Archivo semestral de auditoría: ${trasladados} eventos trasladados.`);
    } catch (error) {
      this.logger.error('Falló el archivo semestral de auditoría', error);
    }
  }
}
