import { randomUUID, webcrypto } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { exportJWK, importJWK, SignJWT, type CryptoKey } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { hashearContrasena } from '../src/compartido/seguridad/contrasena.js';
import { PrismaService } from '../src/compartido/prisma/prisma.service.js';
import { configurarAplicacion } from '../src/compartido/http/configurar-aplicacion.js';
import { AppModule } from '../src/app.module.js';

// §17: batería de pruebas de seguridad obligatorias. El resto de los 12
// casos ya están cubiertos en autenticacion.e2e-spec.ts, usuarios.e2e-spec.ts
// y recuperacion.e2e-spec.ts (enumeración, fuerza bruta/bloqueo, reutilización
// de invitación/recuperación, reutilización de refresh, roles administrativos,
// CSRF, revocación por cambios críticos). "Acceso clínico sin permiso" no
// aplica: ese módulo no existe todavía.
const RUTA_AUTH = '/api/v1/autenticacion';
const CONTRASENA = 'contraseña-válida';

function decodificarSegmento(segmento: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segmento, 'base64url').toString('utf8'));
}

function codificarSegmento(valor: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(valor)).toString('base64url');
}

/** Cambia un campo del payload de un JWT real sin volver a firmarlo. */
function tamperPayload(token: string, cambios: Record<string, unknown>): string {
  const [cabecera, payload, firma] = token.split('.');
  const payloadModificado = { ...decodificarSegmento(payload), ...cambios };
  return `${cabecera}.${codificarSegmento(payloadModificado)}.${firma}`;
}

function obtenerCookie(respuesta: request.Response, nombre: string): string | undefined {
  const cookies = respuesta.headers['set-cookie'];
  const lista: string[] = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const linea = lista.find((c) => c.startsWith(`${nombre}=`));
  return linea?.split(';')[0]?.split('=').slice(1).join('=');
}

describe('Seguridad del JWT y de las sesiones (e2e, §17)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    configurarAplicacion(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function crearUsuarioActivo() {
    const sufijo = randomUUID().replace(/\D/g, '').slice(0, 9) || '123456789';
    return prisma.usuario.create({
      data: {
        nacionalidad: 'V',
        cedula: sufijo,
        nombre: 'Ana',
        apellido: 'Pérez',
        correo: `ana-${randomUUID().slice(0, 8)}@example.com`,
        nombreUsuario: `V${sufijo}`,
        rol: 'FISIOTERAPEUTA',
        estado: 'ACTIVO',
        hashContrasena: await hashearContrasena(CONTRASENA),
        fechaActivacion: new Date(),
      },
    });
  }

  async function iniciarSesionYObtenerAcceso() {
    const usuario = await crearUsuarioActivo();
    const respuesta = await request(app.getHttpServer())
      .post(`${RUTA_AUTH}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: CONTRASENA })
      .expect(201);
    const accessToken = obtenerCookie(respuesta, 'access_token');
    if (!accessToken) throw new Error('No se emitió el access_token');
    return { usuario, accessToken };
  }

  it.each([
    ['sub (usuario distinto)', { sub: randomUUID() }],
    ['role (escalar a Administrador)', { role: 'ADMINISTRADOR' }],
    ['sid (sesión distinta)', { sid: randomUUID() }],
    ['aud (audiencia distinta)', { aud: 'otra-app' }],
    ['iss (emisor distinto)', { iss: 'otro-servidor' }],
    ['exp (vencido)', { exp: Math.floor(Date.now() / 1000) - 60 }],
  ])(
    'rechaza un access token con %s manipulado (firma ya no coincide)',
    async (_nombre, cambios) => {
      const { accessToken } = await iniciarSesionYObtenerAcceso();
      const tokenManipulado = tamperPayload(accessToken, cambios);

      await request(app.getHttpServer())
        .get(`${RUTA_AUTH}/sesiones`)
        .set('Cookie', [`access_token=${tokenManipulado}`])
        .expect(401);
    },
  );

  it('rechaza un token firmado con una clave distinta a la del servidor (atacante sin la clave real)', async () => {
    const usuario = await crearUsuarioActivo();
    const { privateKey } = (await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, [
      'sign',
      'verify',
    ])) as unknown as CryptoKeyPair;
    const claveAjena = (await importJWK(await exportJWK(privateKey), 'EdDSA')) as CryptoKey;

    const tokenFalso = await new SignJWT({
      sub: usuario.idUsuario,
      role: 'ADMINISTRADOR',
      sid: randomUUID(),
    })
      .setProtectedHeader({ alg: 'EdDSA' })
      .setIssuer('trazalia-api')
      .setAudience('trazalia-web')
      .setIssuedAt()
      .setExpirationTime('30m')
      .setJti(randomUUID())
      .sign(claveAjena);

    await request(app.getHttpServer())
      .get(`${RUTA_AUTH}/sesiones`)
      .set('Cookie', [`access_token=${tokenFalso}`])
      .expect(401);
  });

  it('BR-030: dos sesiones simultáneas del mismo usuario se revocan de forma independiente', async () => {
    const usuario = await crearUsuarioActivo();
    const sesionA = request.agent(app.getHttpServer());
    const sesionB = request.agent(app.getHttpServer());

    const csrfA = obtenerCookie(await sesionA.get('/api/v1/salud'), 'XSRF-TOKEN')!;
    await sesionA
      .post(`${RUTA_AUTH}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: CONTRASENA })
      .expect(201);
    await sesionB
      .post(`${RUTA_AUTH}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: CONTRASENA })
      .expect(201);

    await sesionA.post(`${RUTA_AUTH}/cerrar-sesion`).set('X-XSRF-TOKEN', csrfA).expect(201);

    await sesionA.get(`${RUTA_AUTH}/sesiones`).expect(401);
    await sesionB.get(`${RUTA_AUTH}/sesiones`).expect(200);
  });
});
