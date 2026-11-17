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

const RUTA = '/api/v1/historias';
const RUTA_AUTH = '/api/v1/autenticacion';
const CONTRASENA = 'contraseña-válida';

const CARLOS = {
  tipo: 'TRAUMA_ADULTO',
  nombre: 'Carlos',
  apellido: 'Andrade',
  nacionalidad: 'V',
  cedula: '15.482.301',
  fechaNacimiento: '1985-03-14',
  sexo: 'MASCULINO',
  telefono: '0412-555-0134',
};

function obtenerCookie(respuesta: request.Response, nombre: string): string | undefined {
  const cookies = respuesta.headers['set-cookie'];
  const lista: string[] = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const linea = lista.find((c) => c.startsWith(`${nombre}=`));
  return linea?.split(';')[0]?.split('=').slice(1).join('=');
}

describe('Historias clínicas (e2e, PostgreSQL real)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  async function limpiar() {
    // Primero el módulo B: sus FK a acceso.usuarios son RESTRICT.
    await prisma.representanteHistoria.deleteMany();
    await prisma.historiaClinica.deleteMany();
    await prisma.paciente.deleteMany();
    await prisma.registroTokenRenovacion.deleteMany();
    await prisma.sesionUsuario.deleteMany();
    await prisma.invitacionUsuario.deleteMany();
    await prisma.recuperacionContrasena.deleteMany();
    await prisma.intentoAcceso.deleteMany();
    await prisma.usuario.deleteMany();
  }

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

  async function crearUsuario(rol: RolUsuario = 'FISIOTERAPEUTA') {
    const sufijo = randomUUID().replace(/\D/g, '').slice(0, 9) || '123456789';
    return prisma.usuario.create({
      data: {
        nacionalidad: 'V',
        cedula: sufijo,
        nombre: 'Daniela',
        apellido: 'Ortega',
        correo: `fisio-${randomUUID().slice(0, 8)}@example.com`,
        nombreUsuario: `V${sufijo}`,
        rol,
        estado: 'ACTIVO',
        hashContrasena: await hashearContrasena(CONTRASENA),
        fechaActivacion: new Date(),
      },
    });
  }

  async function loginComo(rol: RolUsuario = 'FISIOTERAPEUTA') {
    const usuario = await crearUsuario(rol);
    const agente = request.agent(app.getHttpServer());
    const csrf = obtenerCookie(await agente.get('/api/v1/salud'), 'XSRF-TOKEN');
    if (!csrf) throw new Error('La cookie XSRF-TOKEN no fue emitida');
    await agente
      .post(`${RUTA_AUTH}/iniciar-sesion`)
      .send({ identificador: usuario.correo, contrasena: CONTRASENA })
      .expect(201);
    return {
      usuario,
      agente,
      crear: (cuerpo: object) => agente.post(RUTA).set('X-XSRF-TOKEN', csrf).send(cuerpo),
    };
  }

  it('rechaza sin sesión (401)', async () => {
    await request(app.getHttpServer()).get(RUTA).expect(401);
  });

  it('AC-001: el Administrador no accede a historias por API (403)', async () => {
    const { agente } = await loginComo('ADMINISTRADOR');

    await agente.get(RUTA).expect(403);
  });

  it('exige el token CSRF para crear', async () => {
    const { agente } = await loginComo();

    await agente.post(RUTA).send(CARLOS).expect(403);
  });

  it('RF-006: crea en Borrador con la cédula normalizada y el propietario de la sesión', async () => {
    const { usuario, crear } = await loginComo();

    const respuesta = await crear({ ...CARLOS, idFisioterapeuta: randomUUID() }).expect(201);

    const historia = respuesta.body.historia;
    expect(historia).toMatchObject({
      tipo: 'TRAUMA_ADULTO',
      estado: 'BORRADOR',
      archivada: false,
      cedula: '15482301',
      fechaNacimiento: '1985-03-14',
      puedeIniciarValoracion: false,
      otrasHistorias: [],
    });
    expect(historia.camposFaltantes).toEqual(
      expect.arrayContaining(['dominancia', 'demandasFisicas', 'contactoNombre']),
    );
    const enBd = await prisma.historiaClinica.findUniqueOrThrow({
      where: { idHistoria: historia.idHistoria },
    });
    expect(enBd.idFisioterapeuta).toBe(usuario.idUsuario);
    const auditoria = await prisma.eventoAuditoria.findFirst({
      where: { tipoEvento: 'creacion_historia', idUsuarioActor: usuario.idUsuario },
    });
    expect(auditoria?.metadatosMinimos).toEqual({
      idHistoria: historia.idHistoria,
      tipo: 'TRAUMA_ADULTO',
    });
  });

  it('AC-004: rechaza un adulto sin nacionalidad o sin cédula (400)', async () => {
    const { crear } = await loginComo();

    const sinCedula = await crear({ ...CARLOS, cedula: null }).expect(400);
    expect(sinCedula.body.errores[0].campo).toBe('documento');
    await crear({ ...CARLOS, nacionalidad: null }).expect(400);
    await crear({ ...CARLOS, cedula: null, sinDocumento: true }).expect(400);
  });

  it('rechaza una fecha de nacimiento futura (400)', async () => {
    const { crear } = await loginComo();

    await crear({ ...CARLOS, fechaNacimiento: '2999-01-01' }).expect(400);
  });

  it('AC-006: un duplicado por documento y tipo se bloquea y devuelve la historia existente', async () => {
    const { crear } = await loginComo();
    const primera = await crear(CARLOS).expect(201);

    const duplicada = await crear({ ...CARLOS, cedula: '15482301' }).expect(409);

    expect(duplicada.body.idHistoriaExistente).toBe(primera.body.historia.idHistoria);
  });

  it('RF-011: otro tipo del mismo documento se crea y queda enlazado al mismo paciente', async () => {
    const { agente, crear } = await loginComo();
    const trauma = await crear(CARLOS).expect(201);

    const neuro = await crear({ ...CARLOS, tipo: 'NEURO_ADULTO' }).expect(201);

    expect(neuro.body.historia.otrasHistorias).toEqual([
      expect.objectContaining({
        idHistoria: trauma.body.historia.idHistoria,
        tipo: 'TRAUMA_ADULTO',
      }),
    ]);
    const detalleTrauma = await agente
      .get(`${RUTA}/${trauma.body.historia.idHistoria}`)
      .expect(200);
    expect(detalleTrauma.body.historia.otrasHistorias[0].idHistoria).toBe(
      neuro.body.historia.idHistoria,
    );
  });

  it('RF-009: infantil sin documento bloquea el duplicado por nombre, apellido y nacimiento', async () => {
    const { crear } = await loginComo();
    const sofia = {
      tipo: 'REHAB_INFANTIL',
      nombre: 'Sofía',
      apellido: 'Martínez',
      sinDocumento: true,
      fechaNacimiento: '2022-06-10',
    };
    await crear(sofia).expect(201);

    await crear({ ...sofia, nombre: 'SOFÍA' }).expect(409);
  });

  it('AC-013/§18: aislamiento entre dos fisioterapeutas con documentos idénticos', async () => {
    const a = await loginComo();
    const b = await loginComo();
    const deA = await a.crear(CARLOS).expect(201);

    // El mismo documento bajo otro propietario no es duplicado ni se revela.
    const deB = await b.crear(CARLOS).expect(201);
    expect(deB.body.historia.otrasHistorias).toEqual([]);

    await b.agente.get(`${RUTA}/${deA.body.historia.idHistoria}`).expect(404);
    const listadoB = await b.agente.get(RUTA).expect(200);
    expect(listadoB.body.total).toBe(1);
    expect(listadoB.body.datos[0].idHistoria).toBe(deB.body.historia.idHistoria);
  });

  it('§18 concurrencia: dos solicitudes simultáneas del mismo tipo crean una sola historia', async () => {
    const { usuario, crear } = await loginComo();

    const respuestas = await Promise.all([crear(CARLOS), crear(CARLOS), crear(CARLOS)]);

    expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect(
      await prisma.historiaClinica.count({ where: { idFisioterapeuta: usuario.idUsuario } }),
    ).toBe(1);
  });

  it('AC-016: lista con filtros, búsqueda por nombre o documento y paginación', async () => {
    const { agente, crear } = await loginComo();
    await crear(CARLOS).expect(201);
    await crear({ ...CARLOS, tipo: 'NEURO_ADULTO' }).expect(201);
    await crear({
      tipo: 'ADULTO_MAYOR',
      nombre: 'Carmen Rosa',
      apellido: 'Villegas',
      nacionalidad: 'V',
      cedula: '3215774',
    }).expect(201);

    const porTipo = await agente.get(`${RUTA}?tipo=NEURO_ADULTO`).expect(200);
    expect(porTipo.body.total).toBe(1);

    const porNombre = await agente.get(`${RUTA}?texto=carmen%20villegas`).expect(200);
    expect(porNombre.body.datos.map((h: { nombre: string }) => h.nombre)).toEqual(['Carmen Rosa']);

    const porCedula = await agente.get(`${RUTA}?texto=15.482`).expect(200);
    expect(porCedula.body.total).toBe(2);

    const paginada = await agente.get(`${RUTA}?porPagina=2&pagina=2`).expect(200);
    expect(paginada.body).toMatchObject({
      total: 3,
      pagina: 2,
      conteos: { historias: 3, archivadas: 0 },
    });
    expect(paginada.body.datos).toHaveLength(1);

    const archivadas = await agente.get(`${RUTA}?archivadas=true`).expect(200);
    expect(archivadas.body.total).toBe(0);

    const hoy = new Date().toISOString().slice(0, 10);
    const porFecha = await agente.get(`${RUTA}?creadaDesde=${hoy}&creadaHasta=${hoy}`).expect(200);
    expect(porFecha.body.total).toBe(3);
  });

  it('rechaza un id que no es UUID (400)', async () => {
    const { agente } = await loginComo();

    await agente.get(`${RUTA}/no-es-uuid`).expect(400);
  });
});
