import type { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import { UsuarioRepositorio } from './usuario.repositorio.js';

function crearRepositorio() {
  const usuario = {
    findUnique: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
    findFirst: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
    create: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
    update: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
  };
  const prisma = { usuario } as unknown as PrismaService;
  return { repositorio: new UsuarioRepositorio(prisma), usuario };
}

describe('UsuarioRepositorio', () => {
  it('normaliza el correo y el nombre de usuario al buscar por identificador (BR-010)', async () => {
    const { repositorio, usuario } = crearRepositorio();

    await repositorio.buscarPorIdentificador('  Ana@Correo.COM  ');

    expect(usuario.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ correo: 'ana@correo.com' }, { nombreUsuario: 'Ana@Correo.COM' }] },
    });
  });

  it('crea el usuario en PENDIENTE con el correo normalizado', async () => {
    const { repositorio, usuario } = crearRepositorio();

    await repositorio.crear({
      nacionalidad: 'V',
      cedula: '123',
      nombre: 'Ana',
      apellido: 'Pérez',
      correo: 'ANA@B.com',
      nombreUsuario: 'V123',
      rol: 'FISIOTERAPEUTA',
    });

    expect(usuario.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ correo: 'ana@b.com', estado: 'PENDIENTE' }),
    });
  });

  it('activa la cuenta con hash de contraseña y fecha de activación', async () => {
    const { repositorio, usuario } = crearRepositorio();

    await repositorio.activarConContrasena('u1', 'hash-123');

    expect(usuario.update).toHaveBeenCalledWith({
      where: { idUsuario: 'u1' },
      data: expect.objectContaining({ estado: 'ACTIVO', hashContrasena: 'hash-123' }),
    });
  });

  it('actualiza el estado de la cuenta', async () => {
    const { repositorio, usuario } = crearRepositorio();

    await repositorio.actualizarEstado('u1', 'SUSPENDIDO');

    expect(usuario.update).toHaveBeenCalledWith({
      where: { idUsuario: 'u1' },
      data: { estado: 'SUSPENDIDO' },
    });
  });
});
