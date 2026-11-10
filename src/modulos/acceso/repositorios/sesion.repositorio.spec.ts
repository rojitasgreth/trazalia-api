import type { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import { SesionRepositorio } from './sesion.repositorio.js';

function crearRepositorio() {
  const sesionUsuario = {
    create: vi.fn().mockResolvedValue({ idSesion: 's1' }),
    findUnique: vi.fn().mockResolvedValue({ idSesion: 's1' }),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
    updateMany: vi.fn().mockResolvedValue(undefined),
  };
  const prisma = { sesionUsuario } as unknown as PrismaService;
  return { repositorio: new SesionRepositorio(prisma), sesionUsuario };
}

describe('SesionRepositorio', () => {
  it('lista solo las sesiones sin revocar, ordenadas por actividad reciente', async () => {
    const { repositorio, sesionUsuario } = crearRepositorio();

    await repositorio.listarActivasDeUsuario('u1');

    expect(sesionUsuario.findMany).toHaveBeenCalledWith({
      where: { idUsuario: 'u1', fechaRevocacion: null },
      orderBy: { ultimaActividad: 'desc' },
    });
  });

  it('revoca únicamente la sesión indicada y registra el motivo', async () => {
    const { repositorio, sesionUsuario } = crearRepositorio();

    await repositorio.revocar('s1', 'logout_manual');

    expect(sesionUsuario.updateMany).toHaveBeenCalledWith({
      where: { idSesion: 's1', fechaRevocacion: null },
      data: { fechaRevocacion: expect.any(Date), motivoRevocacion: 'logout_manual' },
    });
  });

  it('revoca todas las sesiones activas de un usuario (AC-023)', async () => {
    const { repositorio, sesionUsuario } = crearRepositorio();

    await repositorio.revocarTodasDeUsuario('u1', 'logout_todas');

    expect(sesionUsuario.updateMany).toHaveBeenCalledWith({
      where: { idUsuario: 'u1', fechaRevocacion: null },
      data: { fechaRevocacion: expect.any(Date), motivoRevocacion: 'logout_todas' },
    });
  });

  it('registra la actividad actualizando la marca de tiempo', async () => {
    const { repositorio, sesionUsuario } = crearRepositorio();

    await repositorio.registrarActividad('s1');

    expect(sesionUsuario.update).toHaveBeenCalledWith({
      where: { idSesion: 's1' },
      data: { ultimaActividad: expect.any(Date) },
    });
  });
});
