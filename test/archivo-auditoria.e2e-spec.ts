import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { validarEntorno } from '../src/configuracion/entorno.js';
import { PrismaService } from '../src/compartido/prisma/prisma.service.js';
import { PrismaModule } from '../src/compartido/prisma/prisma.module.js';
import { ArchivoAuditoriaServicio } from '../src/worker/archivo-auditoria.servicio.js';

// BR-038/AC-036: prueba real contra PostgreSQL, con el rol trazalia_migrador
// (DATABASE_URL_MIGRACIONES), no el de la aplicación. eventos_auditoria es
// append-only para trazalia_app (BR-027): no se puede limpiar entre pruebas
// con el rol de la app, así que estas pruebas miden la diferencia en vez de
// asumir una tabla vacía al empezar.
describe('ArchivoAuditoriaServicio (e2e, PostgreSQL real)', () => {
  let prisma: PrismaService;
  let archivo: ArchivoAuditoriaServicio;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }), PrismaModule],
      providers: [ArchivoAuditoriaServicio],
    }).compile();
    prisma = modulo.get(PrismaService);
    archivo = modulo.get(ArchivoAuditoriaServicio);
  });

  afterAll(async () => {
    await archivo.onModuleDestroy();
  });

  it('traslada todos los eventos a auditoria_historico y vacía la tabla principal', async () => {
    const antes = await prisma.eventoAuditoria.count();
    await prisma.eventoAuditoria.create({
      data: { tipoEvento: 'inicio_sesion', resultado: 'EXITOSO' },
    });
    await prisma.eventoAuditoria.create({
      data: { tipoEvento: 'inicio_sesion', resultado: 'FALLIDO' },
    });

    const trasladados = await archivo.archivarSemestre();

    expect(trasladados).toBe(antes + 2);
    expect(await prisma.eventoAuditoria.count()).toBe(0);
  });

  it('no falla y no hace nada si no quedan eventos por archivar', async () => {
    // Depende de que la prueba anterior haya dejado la tabla vacía.
    await expect(archivo.archivarSemestre()).resolves.toBe(0);
    expect(await prisma.eventoAuditoria.count()).toBe(0);
  });
});
