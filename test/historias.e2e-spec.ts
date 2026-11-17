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
      csrf,
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

  it('AC-011: una historia infantil se guarda sin representante, pero no puede iniciar la valoración', async () => {
    const { crear } = await loginComo();

    const respuesta = await crear({
      tipo: 'REHAB_INFANTIL',
      nombre: 'Sofía',
      apellido: 'Martínez',
      sinDocumento: true,
      fechaNacimiento: '2022-06-10',
      sexo: 'FEMENINO',
      dirEstado: 'Miranda',
      dirMunicipio: 'Sucre',
      dirParroquia: 'Petare',
      dirComunidad: 'Sector 3',
      telefono: '0424-555-1190',
    }).expect(201);

    expect(respuesta.body.historia).toMatchObject({
      sinDocumento: true,
      nacionalidad: null,
      representante: null,
      puedeIniciarValoracion: false,
    });
    expect(respuesta.body.historia.camposFaltantes).toEqual(
      expect.arrayContaining(['representante.parentesco', 'representante.nombre']),
    );
  });

  it('RF-015: con el representante completo, la historia infantil queda lista para valorar', async () => {
    const { crear } = await loginComo();

    const respuesta = await crear({
      tipo: 'REHAB_INFANTIL',
      nombre: 'Mateo',
      apellido: 'Rivas',
      nacionalidad: null,
      cedula: '32123456',
      fechaNacimiento: '2020-02-04',
      sexo: 'MASCULINO',
      dirEstado: 'Lara',
      dirMunicipio: 'Iribarren',
      dirParroquia: 'Catedral',
      dirComunidad: 'Centro',
      telefono: '0414-555-6610',
      representante: {
        parentesco: 'PADRE',
        nombre: 'José',
        apellido: 'Rivas',
        cedula: '12.345.678',
        fechaNacimiento: '1988-01-20',
        estadoCivil: 'Casado(a)',
        gradoInstruccion: 'Universitario',
        ocupacion: 'Ingeniero',
      },
    }).expect(201);

    expect(respuesta.body.historia.representante).toMatchObject({
      parentesco: 'PADRE',
      cedula: '12345678',
      fechaNacimiento: '1988-01-20',
    });
    expect(respuesta.body.historia.camposFaltantes).toEqual([]);
    expect(respuesta.body.historia.puedeIniciarValoracion).toBe(true);
  });

  it('AC-007/B14: consulta coincidencias para autocompletar o detectar duplicados', async () => {
    const { agente, crear, csrf } = await loginComo();
    const consultar = (cuerpo: object) =>
      agente.post(`${RUTA}/coincidencias`).set('X-XSRF-TOKEN', csrf).send(cuerpo).expect(200);
    await crear({
      ...CARLOS,
      demandasFisicas: 'Oficina',
      contactoNombre: 'Patricia Andrade',
    }).expect(201);

    const ninguna = await consultar({ tipo: 'NEURO_ADULTO', nacionalidad: 'V', cedula: '1' });
    expect(ninguna.body).toEqual({ resultado: 'ninguna' });

    const otroTipo = await consultar({
      tipo: 'NEURO_ADULTO',
      nacionalidad: 'V',
      cedula: '15.482.301',
    });
    expect(otroTipo.body).toMatchObject({
      resultado: 'autocompletar',
      historia: { tipo: 'TRAUMA_ADULTO' },
      datos: { nombre: 'Carlos', contactoNombre: 'Patricia Andrade', demandasFisicas: null },
    });

    const mismoTipo = await consultar({
      tipo: 'TRAUMA_ADULTO',
      nacionalidad: 'V',
      cedula: '15482301',
    });
    expect(mismoTipo.body.resultado).toBe('duplicado');

    // Otro fisioterapeuta no descubre nada con la misma cédula (§7.2).
    const otro = await loginComo();
    const ajena = await otro.agente
      .post(`${RUTA}/coincidencias`)
      .set('X-XSRF-TOKEN', otro.csrf)
      .send({ tipo: 'NEURO_ADULTO', nacionalidad: 'V', cedula: '15482301' })
      .expect(200);
    expect(ajena.body).toEqual({ resultado: 'ninguna' });
  });

  it('AC-010/RF-014: edita y propaga solo a las historias no archivadas del paciente', async () => {
    const { agente, crear, csrf } = await loginComo();
    const trauma = (await crear(CARLOS).expect(201)).body.historia;
    const neuro = (await crear({ ...CARLOS, tipo: 'NEURO_ADULTO' }).expect(201)).body.historia;
    const mayor = (await crear({ ...CARLOS, tipo: 'ADULTO_MAYOR' }).expect(201)).body.historia;
    await prisma.historiaClinica.update({
      where: { idHistoria: mayor.idHistoria },
      data: { archivada: true, fechaArchivo: new Date() },
    });
    const editar = (cuerpo: object) =>
      agente.patch(`${RUTA}/${trauma.idHistoria}`).set('X-XSRF-TOKEN', csrf).send(cuerpo);

    // Solo esta historia.
    const soloEsta = await editar({ ...CARLOS, telefono: '0424-555-1111' }).expect(200);
    expect(soloEsta.body.historia.telefono).toBe('0424-555-1111');
    const neuroIntacta = await prisma.historiaClinica.findUniqueOrThrow({
      where: { idHistoria: neuro.idHistoria },
    });
    expect(neuroIntacta.telefono).toBe('0412-555-0134');

    // También las demás: la archivada no cambia.
    await editar({
      ...CARLOS,
      telefono: '0424-555-8890',
      demandasFisicas: 'Oficina',
      propagar: true,
    }).expect(200);
    const [neuroDespues, mayorDespues] = await Promise.all([
      prisma.historiaClinica.findUniqueOrThrow({ where: { idHistoria: neuro.idHistoria } }),
      prisma.historiaClinica.findUniqueOrThrow({ where: { idHistoria: mayor.idHistoria } }),
    ]);
    expect(neuroDespues.telefono).toBe('0424-555-8890');
    expect(neuroDespues.demandasFisicas).toBeNull();
    expect(mayorDespues.telefono).toBe('0412-555-0134');

    const auditoria = await prisma.eventoAuditoria.findFirst({
      where: { tipoEvento: 'actualizacion_historia' },
      orderBy: { fechaEvento: 'desc' },
    });
    expect(auditoria?.metadatosMinimos).toEqual({
      idHistoria: trauma.idHistoria,
      campos: ['telefono'],
      historiasPropagadas: [neuro.idHistoria],
    });

    // Una historia archivada es de solo lectura.
    await agente
      .patch(`${RUTA}/${mayor.idHistoria}`)
      .set('X-XSRF-TOKEN', csrf)
      .send({ ...CARLOS, tipo: undefined })
      .expect(409);
  });

  it('AC-005: en infantil la cédula se añade después editando la historia', async () => {
    const { agente, crear, csrf } = await loginComo();
    const sofia = (
      await crear({
        tipo: 'REHAB_INFANTIL',
        nombre: 'Sofía',
        apellido: 'Martínez',
        sinDocumento: true,
        fechaNacimiento: '2022-06-10',
      }).expect(201)
    ).body.historia;

    const editada = await agente
      .patch(`${RUTA}/${sofia.idHistoria}`)
      .set('X-XSRF-TOKEN', csrf)
      .send({
        nombre: 'Sofía',
        apellido: 'Martínez',
        sinDocumento: false,
        nacionalidad: 'V',
        cedula: '34.567.890',
        fechaNacimiento: '2022-06-10',
      })
      .expect(200);

    expect(editada.body.historia).toMatchObject({
      sinDocumento: false,
      nacionalidad: 'V',
      cedula: '34567890',
    });
  });

  it('AC-013: no se puede editar la historia de otro fisioterapeuta', async () => {
    const a = await loginComo();
    const b = await loginComo();
    const deA = (await a.crear(CARLOS).expect(201)).body.historia;

    await b.agente
      .patch(`${RUTA}/${deA.idHistoria}`)
      .set('X-XSRF-TOKEN', b.csrf)
      .send({ ...CARLOS, nombre: 'Intruso' })
      .expect(404);
    const intacta = await prisma.historiaClinica.findUniqueOrThrow({
      where: { idHistoria: deA.idHistoria },
    });
    expect(intacta.nombre).toBe('Carlos');
  });

  it('AC-015/RF-021: sin registros clínicos se elimina y solo queda la auditoría mínima', async () => {
    const { usuario, agente, crear, csrf } = await loginComo();
    const trauma = (await crear(CARLOS).expect(201)).body.historia;
    const neuro = (await crear({ ...CARLOS, tipo: 'NEURO_ADULTO' }).expect(201)).body.historia;
    const eliminar = (id: string) => agente.delete(`${RUTA}/${id}`).set('X-XSRF-TOKEN', csrf);

    // En esta fase no hay registros: archivar no aplica (se puede eliminar).
    await agente
      .post(`${RUTA}/${trauma.idHistoria}/archivar`)
      .set('X-XSRF-TOKEN', csrf)
      .expect(409);

    await eliminar(trauma.idHistoria).expect(204);
    await agente.get(`${RUTA}/${trauma.idHistoria}`).expect(404);
    // El paciente sigue: le queda la historia de Neurología.
    const pacientes = await prisma.paciente.count({
      where: { idFisioterapeuta: usuario.idUsuario },
    });
    expect(pacientes).toBe(1);

    await eliminar(neuro.idHistoria).expect(204);
    expect(await prisma.paciente.count({ where: { idFisioterapeuta: usuario.idUsuario } })).toBe(0);

    const eventos = await prisma.eventoAuditoria.findMany({
      where: { tipoEvento: 'eliminacion_historia', idUsuarioActor: usuario.idUsuario },
    });
    expect(eventos.map((e) => e.metadatosMinimos)).toEqual(
      expect.arrayContaining([{ idHistoria: trauma.idHistoria }, { idHistoria: neuro.idHistoria }]),
    );
    // Sin copia de los datos eliminados (§13.3).
    expect(JSON.stringify(eventos)).not.toContain('15482301');
  });

  it('AC-013: no se puede eliminar la historia de otro fisioterapeuta', async () => {
    const a = await loginComo();
    const b = await loginComo();
    const deA = (await a.crear(CARLOS).expect(201)).body.historia;

    await b.agente.delete(`${RUTA}/${deA.idHistoria}`).set('X-XSRF-TOKEN', b.csrf).expect(404);
    expect(await prisma.historiaClinica.count({ where: { idHistoria: deA.idHistoria } })).toBe(1);
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

    expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409, 409]);
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
