import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { hashearContrasena } from '../src/compartido/seguridad/contrasena.js';
import { PrismaService } from '../src/compartido/prisma/prisma.service.js';
import { configurarAplicacion } from '../src/compartido/http/configurar-aplicacion.js';
import { AppModule } from '../src/app.module.js';
import { MarcarHistoriaActivaCasoUso } from '../src/modulos/historias/casos-uso/marcar-historia-activa.caso-uso.js';
import { REGISTROS_CLINICOS } from '../src/modulos/historias/puertos/registros-clinicos.js';

const RUTA = '/api/v1/historias';
const CONTRASENA = 'contraseña-válida';

// ADR-0003: en esta fase ninguna historia tiene registros clínicos. Con un
// doble del puerto se ejercen, contra PostgreSQL real, las reglas que
// dependen de ellos: bloqueo del borrado, archivo, desarchivo y Activa.
describe('Historias con registros clínicos (e2e, puerto sustituido)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  async function limpiar() {
    await prisma.representanteHistoria.deleteMany();
    await prisma.historiaClinica.deleteMany();
    await prisma.paciente.deleteMany();
    await prisma.registroTokenRenovacion.deleteMany();
    await prisma.sesionUsuario.deleteMany();
    await prisma.intentoAcceso.deleteMany();
    await prisma.usuario.deleteMany();
  }

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(REGISTROS_CLINICOS)
      .useValue({ tieneRegistros: () => Promise.resolve(true) })
      .compile();
    app = modulo.createNestApplication();
    configurarAplicacion(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await limpiar();
    await app.close();
  });

  beforeEach(limpiar);

  async function sesionDeFisioterapeuta() {
    const sufijo = randomUUID().replace(/\D/g, '').slice(0, 9) || '123456789';
    const usuario = await prisma.usuario.create({
      data: {
        nacionalidad: 'V',
        cedula: sufijo,
        nombre: 'Daniela',
        apellido: 'Ortega',
        correo: `fisio-${randomUUID().slice(0, 8)}@example.com`,
        nombreUsuario: `V${sufijo}`,
        rol: 'FISIOTERAPEUTA',
        estado: 'ACTIVO',
        hashContrasena: await hashearContrasena(CONTRASENA),
        fechaActivacion: new Date(),
      },
    });
    const agente = request.agent(app.getHttpServer());
    const salud = await agente.get('/api/v1/salud');
    const cookies = ([] as string[]).concat(salud.headers['set-cookie'] ?? []);
    const csrf = cookies
      .find((c) => c.startsWith('XSRF-TOKEN='))!
      .split(';')[0]!
      .split('=')[1]!;
    await agente
      .post('/api/v1/autenticacion/iniciar-sesion')
      .send({ identificador: usuario.correo, contrasena: CONTRASENA })
      .expect(201);
    return { usuario, agente, csrf };
  }

  it('AC-014: con registros no se elimina; se archiva, queda de solo lectura y se desarchiva', async () => {
    const { usuario, agente, csrf } = await sesionDeFisioterapeuta();
    const creada = await agente
      .post(RUTA)
      .set('X-XSRF-TOKEN', csrf)
      .send({
        tipo: 'TRAUMA_ADULTO',
        nombre: 'Pedro',
        apellido: 'Lugo',
        nacionalidad: 'V',
        cedula: '9876543',
      })
      .expect(201);
    const id = creada.body.historia.idHistoria as string;

    const detalle = await agente.get(`${RUTA}/${id}`).expect(200);
    expect(detalle.body.historia.tieneRegistrosClinicos).toBe(true);

    const bloqueada = await agente.delete(`${RUTA}/${id}`).set('X-XSRF-TOKEN', csrf).expect(409);
    expect(bloqueada.body.motivo).toBe('registros_clinicos');

    const archivada = await agente
      .post(`${RUTA}/${id}/archivar`)
      .set('X-XSRF-TOKEN', csrf)
      .expect(200);
    expect(archivada.body.historia).toMatchObject({ archivada: true });
    expect(archivada.body.historia.fechaArchivo).toEqual(expect.any(String));

    // Sale del listado principal y aparece en Archivadas (§12.4).
    const principal = await agente.get(RUTA).expect(200);
    expect(principal.body).toMatchObject({ total: 0, conteos: { historias: 0, archivadas: 1 } });
    const archivadas = await agente.get(`${RUTA}?archivadas=true`).expect(200);
    expect(archivadas.body.datos[0].idHistoria).toBe(id);

    // Solo lectura y no se archiva dos veces.
    await agente
      .patch(`${RUTA}/${id}`)
      .set('X-XSRF-TOKEN', csrf)
      .send({ nombre: 'Pedro', apellido: 'Lugo', nacionalidad: 'V', cedula: '9876543' })
      .expect(409);
    await agente.post(`${RUTA}/${id}/archivar`).set('X-XSRF-TOKEN', csrf).expect(409);

    const desarchivada = await agente
      .post(`${RUTA}/${id}/desarchivar`)
      .set('X-XSRF-TOKEN', csrf)
      .expect(200);
    expect(desarchivada.body.historia).toMatchObject({ archivada: false, fechaArchivo: null });
    await agente.post(`${RUTA}/${id}/desarchivar`).set('X-XSRF-TOKEN', csrf).expect(409);

    const tipos = (
      await prisma.eventoAuditoria.findMany({
        where: { idUsuarioActor: usuario.idUsuario },
        select: { tipoEvento: true },
      })
    ).map((e) => e.tipoEvento);
    expect(tipos).toEqual(expect.arrayContaining(['archivo_historia', 'desarchivo_historia']));
  });

  it('AC-012/RF-017: al completar la primera valoración la historia pasa a Activa', async () => {
    const { usuario, agente, csrf } = await sesionDeFisioterapeuta();
    const creada = await agente
      .post(RUTA)
      .set('X-XSRF-TOKEN', csrf)
      .send({
        tipo: 'TRAUMA_ADULTO',
        nombre: 'Ana',
        apellido: 'Torres',
        nacionalidad: 'V',
        cedula: '18220417',
        fechaNacimiento: '1991-07-30',
        sexo: 'FEMENINO',
        dominancia: 'Diestro(a)',
        ocupacion: 'Docente',
        demandasFisicas: 'De pie',
        telefono: '0412-555-9087',
        contactoNombre: 'Luis Torres',
        contactoParentesco: 'Hermano',
        contactoTelefono: '0414-555-0000',
      })
      .expect(201);
    const id = creada.body.historia.idHistoria as string;
    expect(creada.body.historia.puedeIniciarValoracion).toBe(true);

    // Lo invocará el módulo de valoraciones (fase posterior).
    await app.get(MarcarHistoriaActivaCasoUso).ejecutar(usuario.idUsuario, id);

    const detalle = await agente.get(`${RUTA}/${id}`).expect(200);
    expect(detalle.body.historia).toMatchObject({
      estado: 'ACTIVA',
      puedeIniciarValoracion: false,
    });
  });
});
