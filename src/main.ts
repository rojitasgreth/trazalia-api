import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { configurarAplicacion } from './compartido/http/configurar-aplicacion.js';
import { servirWeb } from './compartido/http/servir-web.js';
import type { Entorno } from './configuracion/entorno.js';

async function iniciar(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Entorno, true>>(ConfigService);
  // Detrás del proxy de la plataforma (Render), la IP del cliente llega en
  // X-Forwarded-For; sin esto el rate limiting vería una sola IP para todos.
  if (config.get('CONFIAR_PROXY', { infer: true })) app.set('trust proxy', true);
  // Solo existe en la imagen de calidad (Dockerfile.calidad), que incluye la web.
  const web = join(import.meta.dirname, 'web');
  if (existsSync(join(web, 'index.html'))) servirWeb(app, web);
  configurarAplicacion(app);
  await app.listen(config.get('PUERTO', { infer: true }));
}
await iniciar();
