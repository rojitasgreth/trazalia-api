import type { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { ListarSesionesCasoUso } from './listar-sesiones.caso-uso.js';

describe('ListarSesionesCasoUso', () => {
  it('mapea las sesiones activas a su vista pública, sin exponer el jti', async () => {
    const sesion = {
      idSesion: 's1',
      idUsuario: 'u1',
      etiquetaDispositivo: 'Chrome / Windows',
      resumenJtiRefresh: 'secreto-no-debe-salir',
      fechaCreacion: new Date('2026-01-01'),
      ultimaActividad: new Date('2026-01-02'),
      fechaExpiracion: new Date('2026-01-08'),
      fechaRevocacion: null,
      motivoRevocacion: null,
    };
    const sesiones = {
      listarActivasDeUsuario: vi.fn().mockResolvedValue([sesion]),
    } as unknown as SesionRepositorio;
    const casoUso = new ListarSesionesCasoUso(sesiones);

    const resultado = await casoUso.ejecutar('u1');

    expect(resultado).toEqual([
      {
        idSesion: 's1',
        etiquetaDispositivo: 'Chrome / Windows',
        fechaCreacion: sesion.fechaCreacion,
        ultimaActividad: sesion.ultimaActividad,
      },
    ]);
    expect(JSON.stringify(resultado)).not.toContain('secreto-no-debe-salir');
  });
});
