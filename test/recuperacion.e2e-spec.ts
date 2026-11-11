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
import type { EstadoCuenta } from '../src/generado/prisma/enums.js';

const RUTA = '/api/v1/autenticacion';
const CONTRASENA_ORIGINAL = 'contraseña-original';

describe('Recuperación de contraseña (e2e, PostgreSQL real)', () => {
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
    await prisma.recuperacionContrasena.deleteMany();
    await prisma.intentoAcceso.deleteMany();
    await prisma.registroTokenRenovacion.deleteMany();
    await prisma.sesionUsuario.deleteMany();
    await prisma.invitacionUsuario.deleteMany();
    await prisma.usuario.deleteMany();
  });

  async function crearUsuario(estado: EstadoCuenta) {
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
        estado,
        hashContrasena:
          estado === 'PENDIENTE' ? null : await hashearContrasena(CONTRASENA_ORIGINAL),
        fechaActivacion: estado === 'PENDIENTE' ? null : new Date(),
      },
    });
  }

  it('AC-012: responde "ok" tanto para un correo existente como inexistente', async () => {
    const usuario = await crearUsuario('ACTIVO');

    const conCuenta = await request(app.getHttpServer())
      .post(`${RUTA}/contrasena/recuperar`)
      .send({ correo: usuario.correo })
      .expect(201);
    const sinCuenta = await request(app.getHttpServer())
      .post(`${RUTA}/contrasena/recuperar`)
      .send({ correo: 'nadie@example.com' })
      .expect(201);

    expect(conCuenta.body).toEqual(sinCuenta.body);
  }, 15000);

  it('AC-013: restablece la contraseña, revoca sesiones y permite el login con la nueva', async () => {
    const usuario = await crearUsuario('ACTIVO');
    const token = generarTokenAleatorio();
    await prisma.recuperacionContrasena.create({
      data: {
        idUsuario: usuario.idUsuario,
        resumenToken: resumir(token),
        fechaExpiracion: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    const agente = request.agent(app.getHttpServer());
    await agente
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: CONTRASENA_ORIGINAL })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${RUTA}/contrasena/restablecer`)
      .send({ token, contrasena: 'una-contraseña-nueva' })
      .expect(201);

    await agente.get(`${RUTA}/sesiones`).expect(401);
    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: CONTRASENA_ORIGINAL })
      .expect(401);
    await request(app.getHttpServer())
      .post(`${RUTA}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: 'una-contraseña-nueva' })
      .expect(201);
  }, 15000);

  it('rechaza un token de recuperación ya consumido', async () => {
    const usuario = await crearUsuario('ACTIVO');
    const token = generarTokenAleatorio();
    await prisma.recuperacionContrasena.create({
      data: {
        idUsuario: usuario.idUsuario,
        resumenToken: resumir(token),
        fechaExpiracion: new Date(Date.now() + 15 * 60 * 1000),
        fechaConsumo: new Date(),
      },
    });

    await request(app.getHttpServer())
      .post(`${RUTA}/contrasena/restablecer`)
      .send({ token, contrasena: 'una-contraseña-nueva' })
      .expect(400);
  });

  it('rechaza un token de recuperación vencido', async () => {
    const usuario = await crearUsuario('ACTIVO');
    const token = generarTokenAleatorio();
    await prisma.recuperacionContrasena.create({
      data: {
        idUsuario: usuario.idUsuario,
        resumenToken: resumir(token),
        fechaExpiracion: new Date(Date.now() - 1000),
      },
    });

    await request(app.getHttpServer())
      .post(`${RUTA}/contrasena/restablecer`)
      .send({ token, contrasena: 'una-contraseña-nueva' })
      .expect(400);
  });

  it('una recuperación exitosa levanta un BLOQUEADO (probar el correo es señal más fuerte que esperar)', async () => {
    const usuario = await crearUsuario('ACTIVO');
    await prisma.usuario.update({
      where: { idUsuario: usuario.idUsuario },
      data: { estado: 'BLOQUEADO', bloqueadoHasta: new Date(Date.now() + 60_000) },
    });
    const token = generarTokenAleatorio();
    await prisma.recuperacionContrasena.create({
      data: {
        idUsuario: usuario.idUsuario,
        resumenToken: resumir(token),
        fechaExpiracion: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await request(app.getHttpServer())
      .post(`${RUTA}/contrasena/restablecer`)
      .send({ token, contrasena: 'una-contraseña-nueva' })
      .expect(201);

    const actualizado = await prisma.usuario.findUniqueOrThrow({
      where: { idUsuario: usuario.idUsuario },
    });
    expect(actualizado.estado).toBe('ACTIVO');
    expect(actualizado.bloqueadoHasta).toBeNull();
  }, 15000);

  it.each(['PENDIENTE', 'SUSPENDIDO', 'INACTIVO'] as const)(
    'no envía ninguna recuperación real para una cuenta %s (no crea fila en la base)',
    async (estado) => {
      const usuario = await crearUsuario(estado);

      await request(app.getHttpServer())
        .post(`${RUTA}/contrasena/recuperar`)
        .send({ correo: usuario.correo })
        .expect(201);

      const filas = await prisma.recuperacionContrasena.count({
        where: { idUsuario: usuario.idUsuario },
      });
      expect(filas).toBe(0);
    },
  );
});
