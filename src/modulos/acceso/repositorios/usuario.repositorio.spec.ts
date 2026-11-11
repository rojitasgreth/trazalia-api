import type { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import { UsuarioRepositorio } from './usuario.repositorio.js';

function crearRepositorio() {
  const usuario = {
    findUnique: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
    findFirst: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
    findMany: vi.fn().mockResolvedValue([{ idUsuario: 'u1' }]),
    create: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
    update: vi.fn().mockResolvedValue({ idUsuario: 'u1' }),
    count: vi.fn().mockResolvedValue(1),
    findUniqueOrThrow: vi.fn(),
  };
  const tx = { usuario };
  const prisma = {
    usuario,
    $transaction: vi.fn((callback: (transaccion: typeof tx) => unknown) => callback(tx)),
  } as unknown as PrismaService;
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

  it('bloquear fija el estado BLOQUEADO y la fecha de vencimiento (BR-035)', async () => {
    const { repositorio, usuario } = crearRepositorio();
    const bloqueadoHasta = new Date();

    await repositorio.bloquear('u1', bloqueadoHasta);

    expect(usuario.update).toHaveBeenCalledWith({
      where: { idUsuario: 'u1' },
      data: { estado: 'BLOQUEADO', bloqueadoHasta },
    });
  });

  it('desbloquear vuelve a ACTIVO y limpia la fecha de vencimiento', async () => {
    const { repositorio, usuario } = crearRepositorio();

    await repositorio.desbloquear('u1');

    expect(usuario.update).toHaveBeenCalledWith({
      where: { idUsuario: 'u1' },
      data: { estado: 'ACTIVO', bloqueadoHasta: null },
    });
  });

  it('actualizarContrasena cambia el hash y también levanta un posible bloqueo', async () => {
    const { repositorio, usuario } = crearRepositorio();

    await repositorio.actualizarContrasena('u1', 'hash-nuevo');

    expect(usuario.update).toHaveBeenCalledWith({
      where: { idUsuario: 'u1' },
      data: { hashContrasena: 'hash-nuevo', estado: 'ACTIVO', bloqueadoHasta: null },
    });
  });

  it('lista con filtros de texto, rol y estado, paginado', async () => {
    const { repositorio, usuario } = crearRepositorio();
    usuario.count.mockResolvedValue(1);

    const resultado = await repositorio.listar({
      texto: 'ana',
      rol: 'FISIOTERAPEUTA',
      estado: 'ACTIVO',
      pagina: 2,
      porPagina: 10,
    });

    expect(usuario.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    expect(resultado).toEqual({ datos: [{ idUsuario: 'u1' }], total: 1 });
  });

  it('actualiza datos editables y normaliza el correo si viene', async () => {
    const { repositorio, usuario } = crearRepositorio();

    await repositorio.actualizarDatos('u1', { correo: 'NUEVO@B.com', nombre: 'Ana' });

    expect(usuario.update).toHaveBeenCalledWith({
      where: { idUsuario: 'u1' },
      data: expect.objectContaining({ correo: 'nuevo@b.com', nombre: 'Ana' }),
    });
  });

  it('cambiarEstadoProtegido rechaza si dejaría sin administradores activos (BR-033)', async () => {
    const { repositorio, usuario } = crearRepositorio();
    usuario.findUniqueOrThrow.mockResolvedValue({ rol: 'ADMINISTRADOR', estado: 'ACTIVO' });
    usuario.count.mockResolvedValue(1);

    const resultado = await repositorio.cambiarEstadoProtegido('u1', 'SUSPENDIDO');

    expect(resultado).toEqual({ ok: false });
    expect(usuario.update).not.toHaveBeenCalled();
  });

  it('cambiarEstadoProtegido aplica el cambio si no es el último administrador activo', async () => {
    const { repositorio, usuario } = crearRepositorio();
    usuario.findUniqueOrThrow.mockResolvedValue({ rol: 'ADMINISTRADOR', estado: 'ACTIVO' });
    usuario.count.mockResolvedValue(2);

    const resultado = await repositorio.cambiarEstadoProtegido('u1', 'SUSPENDIDO');

    expect(resultado).toEqual({ ok: true });
    expect(usuario.update).toHaveBeenCalledWith({
      where: { idUsuario: 'u1' },
      data: { estado: 'SUSPENDIDO' },
    });
  });

  it('cambiarEstadoProtegido no cuenta administradores si el usuario no es administrador', async () => {
    const { repositorio, usuario } = crearRepositorio();
    usuario.findUniqueOrThrow.mockResolvedValue({ rol: 'FISIOTERAPEUTA', estado: 'ACTIVO' });

    const resultado = await repositorio.cambiarEstadoProtegido('u1', 'SUSPENDIDO');

    expect(resultado).toEqual({ ok: true });
    expect(usuario.count).not.toHaveBeenCalled();
  });

  it('cambiarRolProtegido rechaza quitarle el rol al único administrador activo (BR-033)', async () => {
    const { repositorio, usuario } = crearRepositorio();
    usuario.findUniqueOrThrow.mockResolvedValue({ rol: 'ADMINISTRADOR', estado: 'ACTIVO' });
    usuario.count.mockResolvedValue(1);

    const resultado = await repositorio.cambiarRolProtegido('u1', 'FISIOTERAPEUTA');

    expect(resultado).toEqual({ ok: false });
    expect(usuario.update).not.toHaveBeenCalled();
  });
});
