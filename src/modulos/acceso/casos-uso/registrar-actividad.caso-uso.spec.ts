import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { RegistrarActividadCasoUso } from './registrar-actividad.caso-uso.js';

describe('RegistrarActividadCasoUso', () => {
  it('actualiza la marca de última actividad de la sesión (BR-036)', async () => {
    const sesiones = {
      registrarActividad: vi.fn().mockResolvedValue(undefined),
    } as unknown as SesionRepositorio;
    const casoUso = new RegistrarActividadCasoUso(sesiones);

    await casoUso.ejecutar('sesion-1');

    expect(sesiones.registrarActividad).toHaveBeenCalledWith('sesion-1');
  });
});
