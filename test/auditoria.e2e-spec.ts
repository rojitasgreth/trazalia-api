import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { hashearContrasena } from '../src/compartido/seguridad/contrasena.js';
import { PrismaService } from '../src/compartido/prisma/prisma.service.js';
import { configurarAplicacion } from '../src/compartido/http/configurar-aplicacion.js';
import { AppModule } from '../src/app.module.js';
import type { RolUsuario } from '../src/generado/prisma/enums.js';

const RUTA = '/api/v1/auditoria';
const RUTA_AUTH = '/api/v1/autenticacion';
const CONTRASENA = 'contraseña-válida';

function obtenerCookie(respuesta: request.Response, nombre: string): string | undefined {
  const cookies = respuesta.headers['set-cookie'];
  const lista: string[] = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const linea = lista.find((c) => c.startsWith(`${nombre}=`));
  return linea?.split(';')[0]?.split('=').slice(1).join('=');
}

describe('Auditoría (e2e, PostgreSQL real)', () => {
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

  async function crearUsuario(rol: RolUsuario) {
    const sufijo = randomUUID().replace(/\D/g, '').slice(0, 9) || '123456789';
    return prisma.usuario.create({
      data: {
        nacionalidad: 'V',
        cedula: sufijo,
        nombre: 'Ana',
        apellido: 'Pérez',
        correo: `ana-${randomUUID().slice(0, 8)}@example.com`,
        nombreUsuario: `V${sufijo}`,
        rol,
        estado: 'ACTIVO',
        hashContrasena: await hashearContrasena(CONTRASENA),
        fechaActivacion: new Date(),
      },
    });
  }

  async function obtenerTokenCsrf(agente: ReturnType<typeof request.agent>): Promise<string> {
    const respuesta = await agente.get('/api/v1/salud');
    const token = obtenerCookie(respuesta, 'XSRF-TOKEN');
    if (!token) throw new Error('La cookie XSRF-TOKEN no fue emitida');
    return token;
  }

  async function loginComo(correo: string) {
    const agente = request.agent(app.getHttpServer());
    const csrf = await obtenerTokenCsrf(agente);
    await agente
      .post(`${RUTA_AUTH}/iniciar-sesion`)
      .send({ identificador: correo, contrasena: CONTRASENA })
      .expect(201);
    return { agente, csrf };
  }

  it('AC-026: deniega el acceso a un fisioterapeuta y audita el intento', async () => {
    const fisio = await crearUsuario('FISIOTERAPEUTA');
    const { agente } = await loginComo(fisio.correo);

    await agente.get(`${RUTA}/eventos`).expect(403);

    const evento = await prisma.eventoAuditoria.findFirst({
      where: { idUsuarioActor: fisio.idUsuario, tipoEvento: 'acceso_denegado' },
      orderBy: { fechaEvento: 'desc' },
    });
    expect(evento?.resultado).toBe('DENEGADO');
  });

  it('rechaza sin sesión (AutenticacionGuard)', async () => {
    await request(app.getHttpServer()).get(`${RUTA}/eventos`).expect(401);
  });

  it('AC-027: un administrador consulta con filtros y paginación, sin secretos', async () => {
    const admin = await crearUsuario('ADMINISTRADOR');
    const { agente } = await loginComo(admin.correo);

    const respuesta = await agente
      .get(`${RUTA}/eventos`)
      .query({ tipoEvento: 'inicio_sesion', resultado: 'EXITOSO', pagina: 1, porPagina: 5 })
      .expect(200);

    expect(respuesta.body.pagina).toBe(1);
    expect(respuesta.body.porPagina).toBe(5);
    expect(Array.isArray(respuesta.body.datos)).toBe(true);
    expect(
      respuesta.body.datos.every((e: Record<string, unknown>) => e.resultado === 'EXITOSO'),
    ).toBe(true);
    const textoRespuesta = JSON.stringify(respuesta.body);
    expect(textoRespuesta).not.toContain('hashContrasena');
    expect(textoRespuesta.toLowerCase()).not.toContain('contrasena');
  });

  it('filtra por usuario (actor o afectado)', async () => {
    const admin = await crearUsuario('ADMINISTRADOR');
    const { agente } = await loginComo(admin.correo);

    const respuesta = await agente
      .get(`${RUTA}/eventos`)
      .query({ idUsuario: admin.idUsuario, pagina: 1, porPagina: 50 })
      .expect(200);

    expect(
      respuesta.body.datos.every(
        (e: { idUsuarioActor: string | null; idUsuarioAfectado: string | null }) =>
          e.idUsuarioActor === admin.idUsuario || e.idUsuarioAfectado === admin.idUsuario,
      ),
    ).toBe(true);
  });
});
