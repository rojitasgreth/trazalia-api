import { esquemaContrasena } from './esquema-contrasena.js';

describe('esquemaContrasena', () => {
  it('acepta una contraseña válida (BR-011)', () => {
    expect(esquemaContrasena.safeParse('12345678').success).toBe(true);
  });

  it('acepta símbolos y caracteres Unicode', () => {
    expect(esquemaContrasena.safeParse('contraseña$€ñ123').success).toBe(true);
  });

  it('rechaza menos de 8 caracteres', () => {
    expect(esquemaContrasena.safeParse('1234567').success).toBe(false);
  });

  it('rechaza contraseñas con espacios', () => {
    expect(esquemaContrasena.safeParse('con espacio').success).toBe(false);
  });

  it('acepta exactamente 32 caracteres', () => {
    expect(esquemaContrasena.safeParse('a'.repeat(32)).success).toBe(true);
  });

  it('rechaza más de 32 caracteres (§8)', () => {
    expect(esquemaContrasena.safeParse('a'.repeat(33)).success).toBe(false);
  });
});
