import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { CerrarTodasSesionesCasoUso } from './cerrar-todas-sesiones.caso-uso.js';

describe('CerrarTodasSesionesCasoUso', () => {
  it('revoca todas las sesiones del usuario y audita el evento', async () => {
    const sesiones = {
      revocarTodasDeUsuario: vi.fn().mockResolvedValue(undefined),
    } as unknown as SesionRepositorio;
    const auditoria = {
      registrar: vi.fn().mockResolvedValue(undefined),
    } as unknown as AuditoriaServicio;
    const casoUso = new CerrarTodasSesionesCasoUso(sesiones, auditoria);

    await casoUso.ejecutar('usuario-1');

    expect(sesiones.revocarTodasDeUsuario).toHaveBeenCalledWith('usuario-1', 'logout_todas');
    expect(auditoria.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ tipoEvento: 'cierre_todas_sesiones', resultado: 'EXITOSO' }),
    );
  });
});
