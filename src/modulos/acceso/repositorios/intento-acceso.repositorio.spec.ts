import type { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import { IntentoAccesoRepositorio } from './intento-acceso.repositorio.js';

function crearRepositorio() {
  const intentoAcceso = {
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    create: vi.fn().mockResolvedValue({ idIntento: 'i1' }),
    count: vi.fn().mockResolvedValue(0),
  };
  const prisma = {
    intentoAcceso,
    $transaction: vi.fn((operaciones: unknown[]) => Promise.all(operaciones)),
  } as unknown as PrismaService;
  return { repositorio: new IntentoAccesoRepositorio(prisma), intentoAcceso };
}

describe('IntentoAccesoRepositorio', () => {
  it('registrarFallo limpia los vencidos y crea uno nuevo, en la misma transacción', async () => {
    const { repositorio, intentoAcceso } = crearRepositorio();
    const inicioVentana = new Date();

    await repositorio.registrarFallo('v12345678', inicioVentana);

    expect(intentoAcceso.deleteMany).toHaveBeenCalledWith({
      where: { identificadorNormalizado: 'v12345678', fechaIntento: { lt: inicioVentana } },
    });
    expect(intentoAcceso.create).toHaveBeenCalledWith({
      data: { identificadorNormalizado: 'v12345678' },
    });
  });

  it('contarFallosRecientes cuenta solo dentro de la ventana', async () => {
    const { repositorio, intentoAcceso } = crearRepositorio();
    const inicioVentana = new Date();
    intentoAcceso.count.mockResolvedValue(4);

    const resultado = await repositorio.contarFallosRecientes('v12345678', inicioVentana);

    expect(intentoAcceso.count).toHaveBeenCalledWith({
      where: { identificadorNormalizado: 'v12345678', fechaIntento: { gte: inicioVentana } },
    });
    expect(resultado).toBe(4);
  });
});
