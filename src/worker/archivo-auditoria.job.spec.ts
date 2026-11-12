import type { ConfigService } from '@nestjs/config';
import type { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ArchivoAuditoriaJob } from './archivo-auditoria.job.js';
import type { ArchivoAuditoriaServicio } from './archivo-auditoria.servicio.js';

function crearDependencias(trasladados = 0) {
  const archivo = {
    archivarSemestre: vi.fn().mockResolvedValue(trasladados),
  } as unknown as ArchivoAuditoriaServicio;
  const scheduler = { addCronJob: vi.fn() } as unknown as SchedulerRegistry;
  const config = {
    get: () => 'America/Caracas',
  } as unknown as ConfigService<never, true>;

  return { archivo, scheduler, config };
}

describe('ArchivoAuditoriaJob', () => {
  it('BR-038: programa el cron del 1 de enero y el 1 de julio a las 00:00 en la zona de negocio', () => {
    const { archivo, scheduler, config } = crearDependencias();

    new ArchivoAuditoriaJob(archivo, scheduler, config).onModuleInit();

    expect(scheduler.addCronJob).toHaveBeenCalledWith(
      'archivo-auditoria-semestral',
      expect.any(CronJob),
    );
    const job = vi.mocked(scheduler.addCronJob).mock.calls[0][1] as CronJob;
    expect(job.cronTime.source).toBe('0 0 0 1 1,7 *');
  });

  it('ejecuta el archivo y no lanza aunque falle (no debe tumbar el worker)', async () => {
    const { archivo, scheduler, config } = crearDependencias();
    vi.mocked(archivo.archivarSemestre).mockRejectedValue(new Error('db caída'));

    const job = new ArchivoAuditoriaJob(archivo, scheduler, config);
    job.onModuleInit();
    const callback = vi.mocked(scheduler.addCronJob).mock.calls[0][1] as CronJob;

    await expect(callback.fireOnTick()).resolves.toBeUndefined();
  });
});
