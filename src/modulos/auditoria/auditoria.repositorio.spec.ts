import type { PrismaService } from '../../compartido/prisma/prisma.service.js';
import { AuditoriaRepositorio } from './auditoria.repositorio.js';

describe('AuditoriaRepositorio', () => {
  it('crea el evento con los metadatos tal cual', async () => {
    const crear = vi.fn().mockResolvedValue(undefined);
    const prisma = { eventoAuditoria: { create: crear } } as unknown as PrismaService;
    const repositorio = new AuditoriaRepositorio(prisma);

    await repositorio.crear({
      tipoEvento: 'inicio_sesion',
      resultado: 'EXITOSO',
      metadatosMinimos: { a: 1 },
    });

    expect(crear).toHaveBeenCalledWith({
      data: { tipoEvento: 'inicio_sesion', resultado: 'EXITOSO', metadatosMinimos: { a: 1 } },
    });
  });

  it('lista con filtros de tipo/resultado/usuario/fechas, paginado', async () => {
    const findMany = vi.fn().mockResolvedValue([{ idEvento: 'e1' }]);
    const count = vi.fn().mockResolvedValue(1);
    const prisma = {
      eventoAuditoria: { findMany, count },
    } as unknown as PrismaService;
    const repositorio = new AuditoriaRepositorio(prisma);
    const desde = new Date('2026-01-01');
    const hasta = new Date('2026-01-31');

    const resultado = await repositorio.listar({
      tipoEvento: 'inicio_sesion',
      resultado: 'FALLIDO',
      idUsuario: 'u1',
      desde,
      hasta,
      pagina: 2,
      porPagina: 10,
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        tipoEvento: 'inicio_sesion',
        resultado: 'FALLIDO',
        OR: [{ idUsuarioActor: 'u1' }, { idUsuarioAfectado: 'u1' }],
        fechaEvento: { gte: desde, lte: hasta },
      },
      orderBy: { fechaEvento: 'desc' },
      skip: 10,
      take: 10,
    });
    expect(resultado).toEqual({ datos: [{ idEvento: 'e1' }], total: 1 });
  });

  it('sin filtros, consulta sin cláusula where adicional', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = {
      eventoAuditoria: { findMany, count },
    } as unknown as PrismaService;
    const repositorio = new AuditoriaRepositorio(prisma);

    await repositorio.listar({ pagina: 1, porPagina: 20 });

    expect(findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { fechaEvento: 'desc' },
      skip: 0,
      take: 20,
    });
  });
});
