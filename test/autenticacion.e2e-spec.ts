import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { hashearContrasena } from '../src/compartido/seguridad/contrasena.js';
import { generarTokenAleatorio, resumir } from '../src/compartido/seguridad/resumen.js';
import { PrismaService } from '../src/compartido/prisma/prisma.service.js';
import { configurarAplicacion } from '../src/compartido/http/configurar-aplicacion.js';
import { AppModule } from '../src/app.module.js';

const RUTA = '/api/v1/autenticacion';

function obtenerCookie(respuesta: request.Response, nombre: string): string | undefined {
  const cookies = respuesta.headers['set-cookie'];
  const lista: string[] = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const linea = lista.find((c) => c.startsWith(`${nombre}=`));
  return linea?.split(';')[0]?.split('=').slice(1).join('=');
}

describe('Autenticación (e2e, PostgreSQL real)', () => {
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

  beforeEach(async () => {
    // Orden por claves foráneas: hijos antes que Usuario. eventos_auditoria no
    // se limpia: trazalia_app solo tiene INSERT/SELECT ahí (BR-027/BR-038),
    // ni siquiera en pruebas — es justamente lo que confirma este límite.
    await prisma.registroTokenRenovacion.deleteMany();
    await prisma.sesionUsuario.deleteMany();
    await prisma.invitacionUsuario.deleteMany();
    await prisma.recuperacionContrasena.deleteMany();
    await prisma.intentoAcceso.deleteMany();
    await prisma.usuario.deleteMany();
  });

  async function crearUsuario(
    estado: 'ACTIVO' | 'PENDIENTE' | 'SUSPENDIDO',
    contrasena = 'contraseña-válida',
  ) {
    const sufijo = randomUUID().slice(0, 8);
    return prisma.usuario.create({
      data: {
        nacionalidad: 'V',
        cedula: sufijo.replace(/\D/g, '') || '123456789',
        nombre: 'Ana',
        apellido: 'Pérez',
        correo: `ana-${sufijo}@example.com`,
        nombreUsuario: `V${sufijo}`,
        rol: 'FISIOTERAPEUTA',
        estado,
        hashContrasena: estado === 'PENDIENTE' ? null : await hashearContrasena(contrasena),
      },
    });
  }

  async function obtenerTokenCsrf(agente: ReturnType<typeof request.agent>): Promise<string> {
    const respuesta = await agente.get('/api/v1/salud');
    const token = obtenerCookie(respuesta, 'XSRF-TOKEN');
    if (!token) throw new Error('La cookie XSRF-TOKEN no fue emitida');
    return token;
  }

  it('AC-008: inicia sesión con correo y contraseña correctos', async () => {
    const usuario = await crearUsuario('ACTIVO');
    const respuesta = await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'contraseña-válida' })
      .expect(201);

    expect(respuesta.body.usuario.idUsuario).toBe(usuario.idUsuario);
    expect(obtenerCookie(respuesta, 'access_token')).toBeTruthy();
    expect(obtenerCookie(respuesta, 'refresh_token')).toBeTruthy();
  });

  it('AC-009: inicia sesión con nombre de usuario', async () => {
    const usuario = await crearUsuario('ACTIVO');
    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.nombreUsuario, contrasena: 'contraseña-válida' })
      .expect(201);
  });

  it('AC-010: rechaza credenciales inválidas con un mensaje genérico', async () => {
    const usuario = await crearUsuario('ACTIVO');
    const respuesta = await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'incorrecta' })
      .expect(401);

    expect(respuesta.body.message).toBe('Credenciales inválidas');
  });

  it.each(['PENDIENTE', 'SUSPENDIDO'] as const)('AC-010: rechaza una cuenta %s', async (estado) => {
    const usuario = await crearUsuario(estado);
    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'contraseña-válida' })
      .expect(401);
  });

  it('protege con CSRF las rutas autenticadas que modifican estado', async () => {
    const usuario = await crearUsuario('ACTIVO');
    const agente = request.agent(app.getHttpServer());
    await agente
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'contraseña-válida' })
      .expect(201);

    // Sin cabecera X-XSRF-TOKEN: debe rechazarse aunque la sesión sea válida.
    await agente.post(`${RUTA}/actividad`).expect(403);
  });

  it('AC-016/flujo completo: login → actividad → listar sesiones → renovar → cerrar sesión', async () => {
    const usuario = await crearUsuario('ACTIVO');
    const agente = request.agent(app.getHttpServer());
    const csrf = await obtenerTokenCsrf(agente);

    await agente
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'contraseña-válida' })
      .expect(201);

    await agente.post(`${RUTA}/actividad`).set('X-XSRF-TOKEN', csrf).expect(201);

    const sesiones = await agente.get(`${RUTA}/sesiones`).expect(200);
    expect(sesiones.body.data).toHaveLength(1);

    const renovado = await agente.post(`${RUTA}/renovar`).set('X-XSRF-TOKEN', csrf).expect(201);
    expect(obtenerCookie(renovado, 'access_token')).toBeTruthy();

    await agente.post(`${RUTA}/cerrar-sesion`).set('X-XSRF-TOKEN', csrf).expect(201);
    await agente.get(`${RUTA}/sesiones`).expect(401);
  });

  it('AC-017: detecta la reutilización de un refresh ya rotado y revoca la sesión', async () => {
    const usuario = await crearUsuario('ACTIVO');
    const agente = request.agent(app.getHttpServer());
    const csrf = await obtenerTokenCsrf(agente);
    const login = await agente
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'contraseña-válida' })
      .expect(201);
    const refreshOriginal = obtenerCookie(login, 'refresh_token')!;

    // Rota una vez (válido).
    await agente.post(`${RUTA}/renovar`).set('X-XSRF-TOKEN', csrf).expect(201);

    // Reutiliza el refresh original, ya consumido.
    await request(app.getHttpServer())
      .post(`${RUTA}/renovar`)
      .set('Cookie', [`refresh_token=${refreshOriginal}`, `XSRF-TOKEN=${csrf}`])
      .set('X-XSRF-TOKEN', csrf)
      .expect(401);

    // La sesión queda revocada: incluso el access token recién renovado deja de servir.
    await agente.get(`${RUTA}/sesiones`).expect(401);
  });

  it('AC-021: una sesión inactiva por más de 60 minutos se revoca y se rechaza', async () => {
    const usuario = await crearUsuario('ACTIVO');
    const agente = request.agent(app.getHttpServer());
    await agente
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'contraseña-válida' })
      .expect(201);

    await prisma.sesionUsuario.updateMany({
      where: { idUsuario: usuario.idUsuario },
      data: { ultimaActividad: new Date(Date.now() - 61 * 60 * 1000) },
    });

    await agente.get(`${RUTA}/sesiones`).expect(401);

    const sesion = await prisma.sesionUsuario.findFirstOrThrow({
      where: { idUsuario: usuario.idUsuario },
    });
    expect(sesion.motivoRevocacion).toBe('inactividad');
  });

  it('AC-005/006: acepta una invitación vigente y permite el login posterior', async () => {
    const usuario = await crearUsuario('PENDIENTE');
    const token = generarTokenAleatorio();
    await prisma.invitacionUsuario.create({
      data: {
        idUsuario: usuario.idUsuario,
        resumenToken: resumir(token),
        fechaExpiracion: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await request(app.getHttpServer())
      .post(`${RUTA}/invitaciones/aceptar`)
      .send({ token, contrasena: 'una-contraseña-nueva' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'una-contraseña-nueva' })
      .expect(201);
  });

  it('BR-031: una invitación vencida suspende la cuenta y rechaza la activación', async () => {
    const usuario = await crearUsuario('PENDIENTE');
    const token = generarTokenAleatorio();
    await prisma.invitacionUsuario.create({
      data: {
        idUsuario: usuario.idUsuario,
        resumenToken: resumir(token),
        fechaExpiracion: new Date(Date.now() - 1000),
      },
    });

    await request(app.getHttpServer())
      .post(`${RUTA}/invitaciones/aceptar`)
      .send({ token, contrasena: 'una-contraseña-nueva' })
      .expect(400);

    const actualizado = await prisma.usuario.findUniqueOrThrow({
      where: { idUsuario: usuario.idUsuario },
    });
    expect(actualizado.estado).toBe('SUSPENDIDO');
  });

  it('AC-025: bloquea una cuenta ACTIVO al cruzar el umbral de intentos fallidos', async () => {
    const usuario = await crearUsuario('ACTIVO');

    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'mal' })
      .expect(401);
    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'mal' })
      .expect(401);
    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'mal' })
      .expect(423);

    // Incluso con la contraseña correcta, sigue bloqueada dentro del plazo.
    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'contraseña-válida' })
      .expect(423);

    const actualizado = await prisma.usuario.findUniqueOrThrow({
      where: { idUsuario: usuario.idUsuario },
    });
    expect(actualizado.estado).toBe('BLOQUEADO');
  }, 15000);

  it('AC-035: un identificador sin cuenta recibe la misma respuesta de bloqueo al cruzar el umbral', async () => {
    const identificador = `nadie-${randomUUID().slice(0, 8)}@example.com`;

    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador, contrasena: 'x' })
      .expect(401);
    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador, contrasena: 'x' })
      .expect(401);
    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador, contrasena: 'x' })
      .expect(423);
  });

  it('BR-035: se desbloquea automáticamente en el intento posterior al vencer el plazo', async () => {
    const usuario = await crearUsuario('ACTIVO');
    await prisma.usuario.update({
      where: { idUsuario: usuario.idUsuario },
      data: { estado: 'BLOQUEADO', bloqueadoHasta: new Date(Date.now() - 1000) },
    });

    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'contraseña-válida' })
      .expect(201);

    const actualizado = await prisma.usuario.findUniqueOrThrow({
      where: { idUsuario: usuario.idUsuario },
    });
    expect(actualizado.estado).toBe('ACTIVO');
    expect(actualizado.bloqueadoHasta).toBeNull();
  });
});
