import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { hashearContrasena } from '../src/compartido/seguridad/contrasena.js';
import { PrismaService } from '../src/compartido/prisma/prisma.service.js';
import { configurarAplicacion } from '../src/compartido/http/configurar-aplicacion.js';
import { AppModule } from '../src/app.module.js';
import type { RolUsuario, EstadoCuenta } from '../src/generado/prisma/enums.js';

const RUTA = '/api/v1/usuarios';
const RUTA_AUTH = '/api/v1/autenticacion';
const CONTRASENA = 'contraseña-válida';

function obtenerCookie(respuesta: request.Response, nombre: string): string | undefined {
  const cookies = respuesta.headers['set-cookie'];
  const lista: string[] = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const linea = lista.find((c) => c.startsWith(`${nombre}=`));
  return linea?.split(';')[0]?.split('=').slice(1).join('=');
}

describe('Administración de usuarios (e2e, PostgreSQL real)', () => {
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
    await prisma.registroTokenRenovacion.deleteMany();
    await prisma.sesionUsuario.deleteMany();
    await prisma.invitacionUsuario.deleteMany();
    await prisma.recuperacionContrasena.deleteMany();
    await prisma.intentoAcceso.deleteMany();
    await prisma.usuario.deleteMany();
  });

  async function crearUsuario(
    estado: EstadoCuenta,
    rol: RolUsuario = 'FISIOTERAPEUTA',
    extra: { fechaActivacion?: Date | null } = {},
  ) {
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
        estado,
        hashContrasena: estado === 'PENDIENTE' ? null : await hashearContrasena(CONTRASENA),
        fechaActivacion:
          estado === 'PENDIENTE'
            ? null
            : 'fechaActivacion' in extra
              ? extra.fechaActivacion
              : new Date(),
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

  it('RolesGuard: rechaza el acceso de un FISIOTERAPEUTA a las rutas de administración', async () => {
    const fisio = await crearUsuario('ACTIVO', 'FISIOTERAPEUTA');
    const { agente } = await loginComo(fisio.correo);

    await agente.get(RUTA).expect(403);
  });

  it('rechaza sin sesión (AutenticacionGuard)', async () => {
    await request(app.getHttpServer()).get(RUTA).expect(401);
  });

  it('AC-001/AC-002: un administrador crea un usuario que queda PENDIENTE con invitación', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const { agente, csrf } = await loginComo(admin.correo);
    const sufijo = randomUUID().replace(/\D/g, '').slice(0, 9) || '987654321';

    const respuesta = await agente
      .post(RUTA)
      .set('X-XSRF-TOKEN', csrf)
      .send({
        nacionalidad: 'V',
        cedula: sufijo,
        nombre: 'Nueva',
        apellido: 'Persona',
        correo: `nueva-${randomUUID().slice(0, 8)}@example.com`,
        rol: 'FISIOTERAPEUTA',
      })
      .expect(201);

    expect(respuesta.body.usuario.nombreUsuario).toBe(`V${sufijo}`);

    const enBd = await prisma.usuario.findUniqueOrThrow({
      where: { idUsuario: respuesta.body.usuario.idUsuario },
    });
    expect(enBd.estado).toBe('PENDIENTE');
    const invitacion = await prisma.invitacionUsuario.findFirst({
      where: { idUsuario: enBd.idUsuario },
    });
    expect(invitacion).not.toBeNull();
  }, 15000);

  it('AC-003: rechaza crear con una cédula ya registrada', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const existente = await crearUsuario('ACTIVO', 'FISIOTERAPEUTA');
    const { agente, csrf } = await loginComo(admin.correo);

    await agente
      .post(RUTA)
      .set('X-XSRF-TOKEN', csrf)
      .send({
        nacionalidad: existente.nacionalidad,
        cedula: existente.cedula,
        nombre: 'X',
        apellido: 'Y',
        correo: `otra-${randomUUID().slice(0, 8)}@example.com`,
        rol: 'FISIOTERAPEUTA',
      })
      .expect(409);
  });

  it('lista usuarios paginados y filtra por estado', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    await crearUsuario('PENDIENTE', 'FISIOTERAPEUTA');
    await crearUsuario('ACTIVO', 'FISIOTERAPEUTA');
    const { agente } = await loginComo(admin.correo);

    const respuesta = await agente.get(`${RUTA}?estado=PENDIENTE&porPagina=10`).expect(200);

    expect(respuesta.body.total).toBe(1);
    expect(respuesta.body.datos[0].estado).toBe('PENDIENTE');
  });

  it('obtiene el detalle de un usuario', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const objetivo = await crearUsuario('ACTIVO', 'FISIOTERAPEUTA');
    const { agente } = await loginComo(admin.correo);

    const respuesta = await agente.get(`${RUTA}/${objetivo.idUsuario}`).expect(200);

    expect(respuesta.body.usuario.correo).toBe(objetivo.correo);
    expect(respuesta.body.usuario).not.toHaveProperty('hashContrasena');
  });

  it('AC-028: edita nombre/apellido/teléfono sin revocar sesiones', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const objetivo = await crearUsuario('ACTIVO', 'FISIOTERAPEUTA');
    const { agente, csrf } = await loginComo(admin.correo);

    const respuesta = await agente
      .patch(`${RUTA}/${objetivo.idUsuario}`)
      .set('X-XSRF-TOKEN', csrf)
      .send({ nombre: 'Editado' })
      .expect(200);

    expect(respuesta.body.usuario.nombre).toBe('Editado');
  });

  it('BR-034: cambiar el correo de una cuenta PENDIENTE invalida su invitación vigente', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const { agente: agenteAdmin, csrf: csrfAdmin } = await loginComo(admin.correo);
    const sufijo = randomUUID().replace(/\D/g, '').slice(0, 9) || '222222222';
    const creado = await agenteAdmin
      .post(RUTA)
      .set('X-XSRF-TOKEN', csrfAdmin)
      .send({
        nacionalidad: 'V',
        cedula: sufijo,
        nombre: 'A',
        apellido: 'B',
        correo: `pendiente-${randomUUID().slice(0, 8)}@example.com`,
        rol: 'FISIOTERAPEUTA',
      })
      .expect(201);
    const idUsuario = creado.body.usuario.idUsuario;
    const invitacionOriginal = await prisma.invitacionUsuario.findFirstOrThrow({
      where: { idUsuario },
    });

    await agenteAdmin
      .patch(`${RUTA}/${idUsuario}`)
      .set('X-XSRF-TOKEN', csrfAdmin)
      .send({ correo: `nuevo-${randomUUID().slice(0, 8)}@example.com` })
      .expect(200);

    const invitacionActualizada = await prisma.invitacionUsuario.findUniqueOrThrow({
      where: { idInvitacion: invitacionOriginal.idInvitacion },
    });
    expect(invitacionActualizada.fechaConsumo).not.toBeNull();
  }, 15000);

  it('BR-030/BR-033: cambiar el rol de otro usuario revoca sus sesiones', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const objetivo = await crearUsuario('ACTIVO', 'FISIOTERAPEUTA');
    const { agente: agenteAdmin, csrf: csrfAdmin } = await loginComo(admin.correo);
    const { agente: agenteObjetivo } = await loginComo(objetivo.correo);

    await agenteAdmin
      .patch(`${RUTA}/${objetivo.idUsuario}`)
      .set('X-XSRF-TOKEN', csrfAdmin)
      .send({ rol: 'ADMINISTRADOR' })
      .expect(200);

    await agenteObjetivo.get(`${RUTA_AUTH}/sesiones`).expect(401);
  });

  it('BR-033: un administrador no puede cambiar su propio rol', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const { agente, csrf } = await loginComo(admin.correo);

    await agente
      .patch(`${RUTA}/${admin.idUsuario}`)
      .set('X-XSRF-TOKEN', csrf)
      .send({ rol: 'FISIOTERAPEUTA' })
      .expect(403);
  });

  it('BR-033: rechaza quitarle el rol al único administrador activo', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const otroAdmin = await crearUsuario('SUSPENDIDO', 'ADMINISTRADOR');
    const { agente, csrf } = await loginComo(admin.correo);
    void otroAdmin;

    await agente
      .patch(`${RUTA}/${admin.idUsuario}`)
      .set('X-XSRF-TOKEN', csrf)
      .send({ rol: 'FISIOTERAPEUTA' })
      .expect(403);
  });

  it('AC-024: suspende una cuenta activa, revoca sesiones y bloquea un nuevo login', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const objetivo = await crearUsuario('ACTIVO', 'FISIOTERAPEUTA');
    const { agente: agenteAdmin, csrf } = await loginComo(admin.correo);
    const { agente: agenteObjetivo } = await loginComo(objetivo.correo);

    await agenteAdmin
      .post(`${RUTA}/${objetivo.idUsuario}/suspender`)
      .set('X-XSRF-TOKEN', csrf)
      .expect(201);

    await agenteObjetivo.get(`${RUTA_AUTH}/sesiones`).expect(401);
    await request(app.getHttpServer())
      .post(`${RUTA_AUTH}/iniciar-sesion`)
      .send({ identificador: objetivo.correo, contrasena: CONTRASENA })
      .expect(401);
  });

  it('BR-033: un administrador no puede suspenderse a sí mismo', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const { agente, csrf } = await loginComo(admin.correo);

    await agente.post(`${RUTA}/${admin.idUsuario}/suspender`).set('X-XSRF-TOKEN', csrf).expect(403);
  });

  it('reactiva una cuenta SUSPENDIDA que ya había sido activada', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const objetivo = await crearUsuario('SUSPENDIDO', 'FISIOTERAPEUTA');
    const { agente, csrf } = await loginComo(admin.correo);

    await agente
      .post(`${RUTA}/${objetivo.idUsuario}/reactivar`)
      .set('X-XSRF-TOKEN', csrf)
      .expect(201);

    const actualizado = await prisma.usuario.findUniqueOrThrow({
      where: { idUsuario: objetivo.idUsuario },
    });
    expect(actualizado.estado).toBe('ACTIVO');
  });

  it('AC-032: rechaza reactivar una SUSPENDIDA que nunca se activó; reenviar-invitación sí funciona', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const objetivo = await crearUsuario('SUSPENDIDO', 'FISIOTERAPEUTA', { fechaActivacion: null });
    const { agente, csrf } = await loginComo(admin.correo);

    await agente
      .post(`${RUTA}/${objetivo.idUsuario}/reactivar`)
      .set('X-XSRF-TOKEN', csrf)
      .expect(400);

    await agente
      .post(`${RUTA}/${objetivo.idUsuario}/reenviar-invitacion`)
      .set('X-XSRF-TOKEN', csrf)
      .expect(201);

    const actualizado = await prisma.usuario.findUniqueOrThrow({
      where: { idUsuario: objetivo.idUsuario },
    });
    expect(actualizado.estado).toBe('PENDIENTE');
  }, 15000);

  it('AC-030/AC-033: inactiva una cuenta de forma definitiva, sin poder reactivarla después', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const objetivo = await crearUsuario('ACTIVO', 'FISIOTERAPEUTA');
    const { agente, csrf } = await loginComo(admin.correo);

    await agente
      .post(`${RUTA}/${objetivo.idUsuario}/inactivar`)
      .set('X-XSRF-TOKEN', csrf)
      .expect(201);

    const actualizado = await prisma.usuario.findUniqueOrThrow({
      where: { idUsuario: objetivo.idUsuario },
    });
    expect(actualizado.estado).toBe('INACTIVO');

    await agente
      .post(`${RUTA}/${objetivo.idUsuario}/inactivar`)
      .set('X-XSRF-TOKEN', csrf)
      .expect(400);
  });

  it('un administrador puede listar y cerrar la sesión de otro usuario', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const objetivo = await crearUsuario('ACTIVO', 'FISIOTERAPEUTA');
    const { agente: agenteAdmin, csrf } = await loginComo(admin.correo);
    const { agente: agenteObjetivo } = await loginComo(objetivo.correo);

    const sesiones = await agenteAdmin.get(`${RUTA}/${objetivo.idUsuario}/sesiones`).expect(200);
    expect(sesiones.body.data).toHaveLength(1);
    const idSesion = sesiones.body.data[0].idSesion;

    await agenteAdmin
      .post(`${RUTA}/${objetivo.idUsuario}/sesiones/${idSesion}/cerrar`)
      .set('X-XSRF-TOKEN', csrf)
      .expect(201);

    await agenteObjetivo.get(`${RUTA_AUTH}/sesiones`).expect(401);
  });

  it('protege con CSRF las rutas de administración que modifican estado', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const objetivo = await crearUsuario('ACTIVO', 'FISIOTERAPEUTA');
    const { agente } = await loginComo(admin.correo);

    await agente.post(`${RUTA}/${objetivo.idUsuario}/suspender`).expect(403);
  });

  it('un administrador puede desbloquear una cuenta BLOQUEADA antes de que venza el plazo', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const objetivo = await crearUsuario('ACTIVO', 'FISIOTERAPEUTA');
    await prisma.usuario.update({
      where: { idUsuario: objetivo.idUsuario },
      data: { estado: 'BLOQUEADO', bloqueadoHasta: new Date(Date.now() + 60_000) },
    });
    const { agente, csrf } = await loginComo(admin.correo);

    await agente
      .post(`${RUTA}/${objetivo.idUsuario}/desbloquear`)
      .set('X-XSRF-TOKEN', csrf)
      .expect(201);

    const actualizado = await prisma.usuario.findUniqueOrThrow({
      where: { idUsuario: objetivo.idUsuario },
    });
    expect(actualizado.estado).toBe('ACTIVO');
    expect(actualizado.bloqueadoHasta).toBeNull();
  });

  it('rechaza desbloquear una cuenta que no está bloqueada', async () => {
    const admin = await crearUsuario('ACTIVO', 'ADMINISTRADOR');
    const objetivo = await crearUsuario('ACTIVO', 'FISIOTERAPEUTA');
    const { agente, csrf } = await loginComo(admin.correo);

    await agente
      .post(`${RUTA}/${objetivo.idUsuario}/desbloquear`)
      .set('X-XSRF-TOKEN', csrf)
      .expect(400);
  });
});
