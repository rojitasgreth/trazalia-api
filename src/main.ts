import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { configurarAplicacion } from './compartido/http/configurar-aplicacion.js';
import type { Entorno } from './configuracion/entorno.js';

async function iniciar(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configurarAplicacion(app);
  const config = app.get<ConfigService<Entorno, true>>(ConfigService);
  await app.listen(config.get('PUERTO', { infer: true }));
}
await iniciar();
