import type { AuditoriaRepositorio } from './auditoria.repositorio.js';
import { AuditoriaServicio } from './auditoria.servicio.js';

describe('AuditoriaServicio', () => {
  it('delega la creación del evento al repositorio', async () => {
    const repositorio = {
      crear: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuditoriaRepositorio;
    const servicio = new AuditoriaServicio(repositorio);

    await servicio.registrar({ tipoEvento: 'inicio_sesion', resultado: 'EXITOSO' });

    expect(repositorio.crear).toHaveBeenCalledWith({
      tipoEvento: 'inicio_sesion',
      resultado: 'EXITOSO',
    });
  });

  it('nunca lanza si el repositorio falla (la auditoría no debe bloquear el flujo de negocio)', async () => {
    const repositorio = {
      crear: vi.fn().mockRejectedValue(new Error('db caída')),
    } as unknown as AuditoriaRepositorio;
    const servicio = new AuditoriaServicio(repositorio);

    await expect(servicio.registrar({ tipoEvento: 'x', resultado: 'y' })).resolves.toBeUndefined();
  });

  it('dentro de una transacción escribe con su cliente y sí propaga el fallo', async () => {
    const repositorio = {
      crear: vi.fn().mockRejectedValue(new Error('db caída')),
    } as unknown as AuditoriaRepositorio;
    const servicio = new AuditoriaServicio(repositorio);
    const tx = { eventoAuditoria: {} } as never;

    await expect(
      servicio.registrarEnTransaccion(tx, {
        tipoEvento: 'eliminacion_historia',
        resultado: 'EXITOSO',
      }),
    ).rejects.toThrow('db caída');
    expect(repositorio.crear).toHaveBeenCalledWith(
      { tipoEvento: 'eliminacion_historia', resultado: 'EXITOSO' },
      tx,
    );
  });
});
