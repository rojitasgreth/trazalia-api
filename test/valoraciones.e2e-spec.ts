import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configurarAplicacion } from '../src/compartido/http/configurar-aplicacion.js';
import { PrismaService } from '../src/compartido/prisma/prisma.service.js';
import { hashearContrasena } from '../src/compartido/seguridad/contrasena.js';
import { PrismaClient } from '../src/generado/prisma/client.js';
import type { RolUsuario } from '../src/generado/prisma/enums.js';

const RUTA = '/api/v1/historias';
const CONTRASENA = 'contraseña-válida';

// Traumatología del adulto con los datos personales completos (lista para valorar).
const CARLOS = {
  tipo: 'TRAUMA_ADULTO',
  nombre: 'Carlos',
  apellido: 'Andrade',
  nacionalidad: 'V',
  cedula: '15482301',
  fechaNacimiento: '1985-03-14',
  sexo: 'MASCULINO',
  dominancia: 'Diestro(a)',
  ocupacion: 'Contador',
  demandasFisicas: 'Oficina',
  telefono: '04125550134',
  contactoNombre: 'Patricia Andrade',
  contactoParentesco: 'Esposa',
  contactoTelefono: '04145552290',
  modalidad: 'DOMICILIO',
  dirEstado: 'Miranda',
  dirMunicipio: 'Sucre',
  dirParroquia: 'Petare',
  dirComunidad: 'Sector 3',
};

function obtenerCookie(respuesta: request.Response, nombre: string): string | undefined {
  const cookies = respuesta.headers['set-cookie'];
  const lista: string[] = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const linea = lista.find((c) => c.startsWith(`${nombre}=`));
  return linea?.split(';')[0]?.split('=').slice(1).join('=');
}

describe('Valoraciones (e2e, PostgreSQL real)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  // La aplicación no puede borrar valoraciones (sin DELETE) y una finalizada
  // está protegida por un trigger: la limpieza usa el rol de migraciones y
  // desactiva el trigger solo mientras borra.
  const migrador = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL_MIGRACIONES'] }),
  });

  async function limpiar() {
    await migrador.$executeRawUnsafe(
      'ALTER TABLE valoraciones.valoraciones DISABLE TRIGGER valoraciones_inmutables_finalizadas',
    );
    await migrador.valoracion.deleteMany();
    await migrador.$executeRawUnsafe(
      'ALTER TABLE valoraciones.valoraciones ENABLE TRIGGER valoraciones_inmutables_finalizadas',
    );
    await migrador.historiaClinica.deleteMany();
    await migrador.paciente.deleteMany();
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

  async function loginComo(rol: RolUsuario = 'FISIOTERAPEUTA') {
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
    const csrf = obtenerCookie(await agente.get('/api/v1/salud'), 'XSRF-TOKEN');
    if (!csrf) throw new Error('La cookie XSRF-TOKEN no fue emitida');
    await agente
      .post('/api/v1/autenticacion/iniciar-sesion')
      .send({ identificador: usuario.correo, contrasena: CONTRASENA })
      .expect(201);
    const ruta = (id: string, extra = '') => `${RUTA}/${id}/valoracion${extra}`;
    return {
      usuario,
      agente,
      crearHistoria: async (cuerpo: object = CARLOS) =>
        (await agente.post(RUTA).set('X-XSRF-TOKEN', csrf).send(cuerpo).expect(201)).body.historia
          .idHistoria as string,
      obtener: (id: string) => agente.get(ruta(id)),
      iniciar: (id: string) => agente.post(ruta(id)).set('X-XSRF-TOKEN', csrf),
      guardar: (id: string, contenido: object, version: number) =>
        agente.put(ruta(id)).set('X-XSRF-TOKEN', csrf).send({ contenido, version }),
      finalizar: (id: string, version: number) =>
        agente.post(ruta(id, '/finalizar')).set('X-XSRF-TOKEN', csrf).send({ version }),
      imprimir: (id: string) => agente.post(ruta(id, '/impresion')).set('X-XSRF-TOKEN', csrf),
      historia: (id: string) => agente.get(`${RUTA}/${id}`),
      eliminar: (id: string) => agente.delete(`${RUTA}/${id}`).set('X-XSRF-TOKEN', csrf),
    };
  }

  it('sin valoración devuelve la ficha vigente y los datos personales de la historia', async () => {
    const f = await loginComo();
    const id = await f.crearHistoria();

    const { body } = await f.obtener(id).expect(200);

    expect(body.valoracion).toBeNull();
    expect(body.ficha).toMatchObject({ tipo: 'TRAUMA_ADULTO', version: 1 });
    expect(body.datos).toMatchObject({
      nombre: 'Carlos Andrade',
      documento: 'V-15.482.301',
      sexo: 'Masculino',
    });
    expect(body.historia.puedeIniciarValoracion).toBe(true);
  });

  it('AC-C01: con datos personales incompletos no se puede iniciar', async () => {
    const f = await loginComo();
    const id = await f.crearHistoria({ ...CARLOS, ocupacion: null });

    const respuesta = await f.iniciar(id).expect(409);

    expect(respuesta.body.camposFaltantes).toContain('ocupacion');
  });

  it('AC-C02/AC-C13: inicia con fisioterapeuta y fecha automáticos, y solo una vez (también en paralelo)', async () => {
    const f = await loginComo();
    const id = await f.crearHistoria();

    const [a, b] = await Promise.all([f.iniciar(id), f.iniciar(id)]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const creada = (a.status === 201 ? a : b).body;
    expect(creada.valoracion).toMatchObject({
      estado: 'EN_CURSO',
      nombreFisioterapeuta: 'Daniela Ortega',
      version: 1,
      contenido: { 's11.paciente_representante_nombre': 'Carlos Andrade' },
    });
    expect(await prisma.valoracion.count({ where: { idHistoria: id } })).toBe(1);
  });

  it('AC-C04: guarda a medias y la historia sigue en Borrador; otra versión responde 409', async () => {
    const f = await loginComo();
    const id = await f.crearHistoria();
    await f.iniciar(id).expect(201);

    const guardada = await f
      .guardar(id, { 's2.fase': 'Subaguda', 's1.medico_tratante': ' Dr. Mendoza ' }, 1)
      .expect(200);
    expect(guardada.body.valoracion).toMatchObject({
      version: 2,
      contenido: { 's2.fase': 'Subaguda', 's1.medico_tratante': 'Dr. Mendoza' },
    });
    expect((await f.historia(id).expect(200)).body.historia.estado).toBe('BORRADOR');

    // Otra pestaña con la versión vieja no sobrescribe (SPEC C §13).
    const conflicto = await f.guardar(id, { 's2.fase': 'Aguda' }, 1).expect(409);
    expect(conflicto.body.motivo).toBe('version');
    await f.guardar(id, { 's2.fase': 'Inventada' }, 2).expect(400);
  });

  it('AC-C05/AC-C07: finaliza con campos vacíos, la historia pasa a Activa y ya no se modifica', async () => {
    const f = await loginComo();
    const id = await f.crearHistoria();
    await f.iniciar(id).expect(201);

    const { body } = await f.finalizar(id, 1).expect(200);

    expect(body.valoracion).toMatchObject({ estado: 'FINALIZADA' });
    expect(body.valoracion.fechaFinalizacion).toEqual(expect.any(String));
    expect(body.historia.estado).toBe('ACTIVA');
    expect((await f.historia(id).expect(200)).body.historia.estado).toBe('ACTIVA');
    expect((await f.guardar(id, { 's2.fase': 'Aguda' }, 2).expect(409)).body.motivo).toBe(
      'finalizada',
    );
    await f.finalizar(id, 2).expect(409);
  });

  it('decisión del 19-11-2026: la finalizada muestra la foto de los datos personales', async () => {
    const f = await loginComo();
    const id = await f.crearHistoria();
    await f.iniciar(id).expect(201);
    await f.finalizar(id, 1).expect(200);

    await prisma.historiaClinica.update({
      where: { idHistoria: id },
      data: { telefono: '04249990000' },
    });

    expect((await f.obtener(id).expect(200)).body.datos.telefono).toBe('04125550134');
  });

  it('RF-C14: la base de datos rechaza modificar o borrar una valoración finalizada', async () => {
    const f = await loginComo();
    const id = await f.crearHistoria();
    await f.iniciar(id).expect(201);
    await f.finalizar(id, 1).expect(200);

    await expect(
      prisma.valoracion.updateMany({ where: { idHistoria: id }, data: { contenido: { x: 1 } } }),
    ).rejects.toThrow();
    await expect(migrador.valoracion.deleteMany({ where: { idHistoria: id } })).rejects.toThrow();
  });

  it('decisión del 19-11-2026: con una valoración en curso la historia no se elimina, se archiva', async () => {
    const f = await loginComo();
    const id = await f.crearHistoria();
    await f.iniciar(id).expect(201);

    const respuesta = await f.eliminar(id).expect(409);

    expect(respuesta.body.motivo).toBe('registros_clinicos');
    expect((await f.historia(id).expect(200)).body.historia.tieneRegistrosClinicos).toBe(true);
  });

  it('RF-C19: la impresión solo se registra para una finalizada', async () => {
    const f = await loginComo();
    const id = await f.crearHistoria();
    await f.iniciar(id).expect(201);
    await f.imprimir(id).expect(409);
    await f.finalizar(id, 1).expect(200);

    await f.imprimir(id).expect(204);

    const eventos = await prisma.eventoAuditoria.findMany({
      where: { idUsuarioActor: f.usuario.idUsuario, tipoEvento: { endsWith: '_valoracion' } },
    });
    expect(eventos.map((e) => e.tipoEvento).sort()).toEqual([
      'finalizacion_valoracion',
      'impresion_valoracion',
      'inicio_valoracion',
    ]);
    expect(JSON.stringify(eventos.map((e) => e.metadatosMinimos))).not.toContain('Carlos');
  });

  it('AC-C12: otro fisioterapeuta no la ve ni la modifica (404) y el Administrador no accede (403)', async () => {
    const duena = await loginComo();
    const id = await duena.crearHistoria();
    await duena.iniciar(id).expect(201);

    const otra = await loginComo();
    await otra.obtener(id).expect(404);
    await otra.guardar(id, {}, 1).expect(404);
    await otra.finalizar(id, 1).expect(404);

    const admin = await loginComo('ADMINISTRADOR');
    await admin.obtener(id).expect(403);
  });
});
