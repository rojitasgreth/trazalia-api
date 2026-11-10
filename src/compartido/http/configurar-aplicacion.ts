import type { INestApplication } from '@nestjs/common';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { Entorno } from '../../configuracion/entorno.js';
import { crearMiddlewareCsrf } from '../seguridad/csrf.middleware.js';

export const PREFIJO_API = 'api/v1';

/**
 * Configuración HTTP común a main.ts y a las pruebas e2e, para que las pruebas
 * ejerzan exactamente la misma aplicación que producción.
 */
export function configurarAplicacion(app: INestApplication): void {
  const config = app.get<ConfigService<Entorno, true>>(ConfigService);
  const esProduccion = config.get('NODE_ENV', { infer: true }) === 'production';

  app.setGlobalPrefix(PREFIJO_API);
  app.use(helmet());
  app.use(cookieParser());
  app.use(crearMiddlewareCsrf(esProduccion));
  app.enableCors({ origin: config.get('ORIGEN_WEB', { infer: true }), credentials: true });
  // Valida @Body/@Query/@Param({ schema }) con esquemas Zod (Standard Schema).
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();

  if (!esProduccion) {
    const documento = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Trazalia API').setVersion('1').build(),
    );
    SwaggerModule.setup(`${PREFIJO_API}/docs`, app, documento);
  }
}
