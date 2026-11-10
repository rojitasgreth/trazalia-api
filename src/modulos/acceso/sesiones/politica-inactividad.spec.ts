import { expiroPorInactividad, INACTIVIDAD_MAXIMA_MS } from './politica-inactividad.js';

describe('expiroPorInactividad', () => {
  it('no expira justo en el límite de 60 minutos', () => {
    const ultimaActividad = new Date('2026-01-01T00:00:00.000Z');
    const ahora = new Date(ultimaActividad.getTime() + INACTIVIDAD_MAXIMA_MS);

    expect(expiroPorInactividad(ultimaActividad, ahora)).toBe(false);
  });

  it('expira un milisegundo después del límite', () => {
    const ultimaActividad = new Date('2026-01-01T00:00:00.000Z');
    const ahora = new Date(ultimaActividad.getTime() + INACTIVIDAD_MAXIMA_MS + 1);

    expect(expiroPorInactividad(ultimaActividad, ahora)).toBe(true);
  });

  it('no expira con actividad reciente', () => {
    const ahora = new Date('2026-01-01T01:00:00.000Z');
    const ultimaActividad = new Date(ahora.getTime() - 5 * 60 * 1000);

    expect(expiroPorInactividad(ultimaActividad, ahora)).toBe(false);
  });
});
