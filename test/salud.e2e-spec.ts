import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configurarAplicacion } from '../src/compartido/http/configurar-aplicacion.js';

describe('GET /api/v1/salud (e2e, PostgreSQL real)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configurarAplicacion(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde ok con la base de datos disponible', async () => {
    const respuesta = await request(app.getHttpServer()).get('/api/v1/salud').expect(200);

    expect(respuesta.body).toEqual({ estado: 'ok', baseDeDatos: 'ok' });
  });

  it('aplica cabeceras de seguridad', async () => {
    const respuesta = await request(app.getHttpServer()).get('/api/v1/salud');

    expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
    expect(respuesta.headers['x-powered-by']).toBeUndefined();
  });

  it('solo responde bajo el prefijo /api/v1', async () => {
    await request(app.getHttpServer()).get('/salud').expect(404);
  });
});
