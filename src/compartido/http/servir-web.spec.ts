import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { servirWeb } from './servir-web.js';

@Controller('salud')
class SaludDePrueba {
  @Get()
  salud() {
    return { estado: 'ok' };
  }
}

@Module({ controllers: [SaludDePrueba] })
class ModuloDePrueba {}

describe('servirWeb (calidad: web y API en el mismo dominio)', () => {
  let carpeta: string;
  let app: NestExpressApplication;

  beforeAll(async () => {
    carpeta = mkdtempSync(join(tmpdir(), 'trazalia-web-'));
    writeFileSync(join(carpeta, 'index.html'), '<app-root></app-root>');
    writeFileSync(join(carpeta, 'main-ABC123.js'), 'console.log(1)');
    app = await NestFactory.create<NestExpressApplication>(ModuloDePrueba, { logger: false });
    servirWeb(app, carpeta);
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    rmSync(carpeta, { recursive: true, force: true });
  });

  it('sirve los archivos con hash con caché larga', async () => {
    const respuesta = await request(app.getHttpServer()).get('/main-ABC123.js').expect(200);
    expect(respuesta.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(respuesta.headers['x-frame-options']).toBe('DENY');
  });

  it('cualquier ruta de la SPA devuelve index.html sin caché', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/historias/abc/valoracion')
      .set('Accept', 'text/html')
      .expect(200);
    expect(respuesta.text).toContain('<app-root>');
    expect(respuesta.headers['cache-control']).toBe('no-cache');
  });

  it('las rutas de la API siguen en NestJS, y las desconocidas dan 404', async () => {
    await request(app.getHttpServer()).get('/api/v1/salud').expect(200, { estado: 'ok' });
    const noExiste = await request(app.getHttpServer())
      .get('/api/v1/no-existe')
      .set('Accept', 'text/html')
      .expect(404);
    expect(noExiste.text).not.toContain('<app-root>');
  });
});
