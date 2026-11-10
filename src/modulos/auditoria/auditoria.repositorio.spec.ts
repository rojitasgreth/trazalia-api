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
});
