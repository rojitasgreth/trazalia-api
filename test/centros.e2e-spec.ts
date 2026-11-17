import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { hashearContrasena } from '../src/compartido/seguridad/contrasena.js';
import { PrismaService } from '../src/compartido/prisma/prisma.service.js';
import { configurarAplicacion } from '../src/compartido/http/configurar-aplicacion.js';
import { AppModule } from '../src/app.module.js';
import { PrismaClient } from '../src/generado/prisma/client.js';
import type { RolUsuario } from '../src/generado/prisma/enums.js';

const CONTRASENA = 'contraseña-válida';
const SANTA_SOFIA = {
  nombre: 'Clínica Santa Sofía',
  dirEstado: 'Miranda',
  dirMunicipio: 'Sucre',
  dirParroquia: 'Petare',
};

// SPEC B v1.4 §8.6–§8.7 / ADR-0004: catálogo compartido de centros médicos y
// modalidad de atención de la historia.
describe('Centros médicos y modalidad de atención (e2e, PostgreSQL real)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // El catálogo no se puede borrar con el rol de la aplicación (ADR-0004):
  // la limpieza usa el rol propietario, como archivo-auditoria.e2e-spec.ts.
  const migrador = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL_MIGRACIONES'] }),
  });

  async function limpiar() {
    await migrador.representanteHistoria.deleteMany();
    await migrador.historiaClinica.deleteMany();
    await migrador.paciente.deleteMany();
    await migrador.centroMedico.deleteMany();
    await migrador.registroTokenRenovacion.deleteMany();
    await migrador.sesionUsuario.deleteMany();
    await migrador.intentoAcceso.deleteMany();
    await migrador.usuario.deleteMany();
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
    await migrador.$disconnect();
    await app.close();
  });

  beforeEach(limpiar);

  async function sesion(rol: RolUsuario = 'FISIOTERAPEUTA') {
    const sufijo = randomUUID().replace(/\D/g, '').slice(0, 9) || '123456789';
    const usuario = await prisma.usuario.create({
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
    return {
      usuario,
      agente,
      post: (ruta: string, cuerpo: object) =>
        agente.post(`/api/v1${ruta}`).set('X-XSRF-TOKEN', csrf).send(cuerpo),
      patch: (ruta: string, cuerpo: object) =>
        agente.patch(`/api/v1${ruta}`).set('X-XSRF-TOKEN', csrf).send(cuerpo),
    };
  }

  it('el Administrador no accede al catálogo (403) y sin sesión es 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/centros?texto=cl').expect(401);
    const admin = await sesion('ADMINISTRADOR');
    await admin.agente.get('/api/v1/centros?texto=cl').expect(403);
  });

  it('ADR-0004: un centro registrado por un fisio lo encuentran los demás y no se duplica', async () => {
    const daniela = await sesion();
    const luis = await sesion();

    const creado = await daniela.post('/centros', SANTA_SOFIA).expect(201);
    expect(creado.body.centro).toEqual({
      idCentro: expect.any(String),
      nombre: 'Clínica Santa Sofía',
      estado: 'Miranda',
      municipio: 'Sucre',
      parroquia: 'Petare',
      comunidad: null,
    });

    // Otro fisio lo encuentra sin tildes ni mayúsculas.
    const busqueda = await luis.agente.get('/api/v1/centros?texto=santa%20sofia').expect(200);
    expect(busqueda.body.datos).toHaveLength(1);
    expect(busqueda.body.datos[0]).not.toHaveProperty('idFisioterapeutaCreador');

    // Mismo nombre con otra escritura en el mismo municipio: 409 con el existente.
    const duplicado = await luis
      .post('/centros', { ...SANTA_SOFIA, nombre: 'CLINICA  santa sofia', dirMunicipio: ' sucre ' })
      .expect(409);
    expect(duplicado.body.centro.idCentro).toBe(creado.body.centro.idCentro);
    expect(await prisma.centroMedico.count()).toBe(1);

    // Mismo nombre en otro municipio sí es otro centro.
    await luis.post('/centros', { ...SANTA_SOFIA, dirMunicipio: 'Baruta' }).expect(201);
  });

  it('valida el texto de búsqueda y los datos del centro (400)', async () => {
    const fisio = await sesion();
    await fisio.agente.get('/api/v1/centros?texto=c').expect(400);
    await fisio.post('/centros', { ...SANTA_SOFIA, dirEstado: 'Narnia' }).expect(400);
    await fisio.post('/centros', { ...SANTA_SOFIA, dirParroquia: '' }).expect(400);
  });

  it('RF-028–RF-030: historia atendida en un centro; el centro debe existir', async () => {
    const fisio = await sesion();
    const centro = (await fisio.post('/centros', SANTA_SOFIA).expect(201)).body.centro;
    const carlos = {
      tipo: 'TRAUMA_ADULTO',
      nombre: 'Carlos',
      apellido: 'Andrade',
      nacionalidad: 'V',
      cedula: '15482301',
    };

    const sinModalidad = await fisio.post('/historias', carlos).expect(201);
    expect(sinModalidad.body.historia.camposFaltantes).toContain('modalidad');

    await fisio
      .post('/historias', {
        ...carlos,
        tipo: 'NEURO_ADULTO',
        modalidad: 'CENTRO',
        idCentro: randomUUID(),
      })
      .expect(400);

    const enCentro = await fisio
      .post('/historias', {
        ...carlos,
        tipo: 'NEURO_ADULTO',
        modalidad: 'CENTRO',
        idCentro: centro.idCentro,
      })
      .expect(201);
    expect(enCentro.body.historia).toMatchObject({
      datos: { modalidad: 'CENTRO', idCentro: centro.idCentro },
      centro: { nombre: 'Clínica Santa Sofía' },
    });
    expect(enCentro.body.historia.camposFaltantes).not.toContain('idCentro');

    // A domicilio, Traumatología pide la dirección del paciente y el centro se descarta.
    const id = sinModalidad.body.historia.idHistoria as string;
    const domicilio = await fisio
      .patch(`/historias/${id}`, {
        ...carlos,
        tipo: undefined,
        modalidad: 'DOMICILIO',
        idCentro: centro.idCentro,
      })
      .expect(200);
    expect(domicilio.body.historia).toMatchObject({
      datos: { modalidad: 'DOMICILIO', idCentro: null },
      centro: null,
    });
    expect(domicilio.body.historia.camposFaltantes).toEqual(
      expect.arrayContaining(['dirEstado', 'dirMunicipio', 'dirParroquia']),
    );
  });

  it('la base de datos no permite a la aplicación editar ni borrar centros', async () => {
    const fisio = await sesion();
    await fisio.post('/centros', SANTA_SOFIA).expect(201);

    await expect(prisma.centroMedico.updateMany({ data: { nombre: 'Otro' } })).rejects.toThrow(
      /permission denied/,
    );
  });
});
