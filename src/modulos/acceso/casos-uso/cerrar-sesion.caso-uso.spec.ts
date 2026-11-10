import { ForbiddenException } from '@nestjs/common';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { CerrarSesionCasoUso } from './cerrar-sesion.caso-uso.js';

function crearCasoUso(sesionEncontrada: Record<string, unknown> | null) {
  const sesiones = {
    revocar: vi.fn().mockResolvedValue(undefined),
    buscarPorId: vi.fn().mockResolvedValue(sesionEncontrada),
  } as unknown as SesionRepositorio;
  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;
  return { casoUso: new CerrarSesionCasoUso(sesiones, auditoria), sesiones };
}

describe('CerrarSesionCasoUso', () => {
  it('revoca la sesión actual cuando no se indica otra', async () => {
    const { casoUso, sesiones } = crearCasoUso(null);

    await casoUso.ejecutar('usuario-1', 'sesion-1');

    expect(sesiones.revocar).toHaveBeenCalledWith('sesion-1', 'logout_manual');
  });

  it('revoca una sesión propia distinta a la actual (AC-023)', async () => {
    const { casoUso, sesiones } = crearCasoUso({ idUsuario: 'usuario-1' });

    await casoUso.ejecutar('usuario-1', 'sesion-actual', 'sesion-otro-dispositivo');

    expect(sesiones.revocar).toHaveBeenCalledWith('sesion-otro-dispositivo', 'logout_manual');
  });

  it('rechaza revocar una sesión de otro usuario', async () => {
    const { casoUso } = crearCasoUso({ idUsuario: 'usuario-2' });

    await expect(casoUso.ejecutar('usuario-1', 'sesion-actual', 'sesion-ajena')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rechaza si la sesión objetivo no existe', async () => {
    const { casoUso } = crearCasoUso(null);

    await expect(
      casoUso.ejecutar('usuario-1', 'sesion-actual', 'sesion-inexistente'),
    ).rejects.toThrow(ForbiddenException);
  });
});
