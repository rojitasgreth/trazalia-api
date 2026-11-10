import { generarTokenAleatorio, resumir } from './resumen.js';

describe('resumen', () => {
  it('genera tokens aleatorios distintos en cada llamada', () => {
    const a = generarTokenAleatorio();
    const b = generarTokenAleatorio();

    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it('resume de forma determinista: el mismo valor produce el mismo resumen', () => {
    const token = generarTokenAleatorio();

    expect(resumir(token)).toBe(resumir(token));
  });

  it('nunca expone el valor original dentro del resumen', () => {
    const token = generarTokenAleatorio();

    expect(resumir(token)).not.toContain(token);
  });
});
