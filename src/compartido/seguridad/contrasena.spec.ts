import { hashearContrasena, verificarContrasena } from './contrasena.js';

describe('contrasena', () => {
  it('produce un hash Argon2id y lo verifica correctamente', async () => {
    const hash = await hashearContrasena('una-contraseña-válida');

    expect(hash).toContain('$argon2id$');
    await expect(verificarContrasena(hash, 'una-contraseña-válida')).resolves.toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashearContrasena('correcta');

    await expect(verificarContrasena(hash, 'incorrecta')).resolves.toBe(false);
  });

  it('nunca lanza ante un hash corrupto o inválido', async () => {
    await expect(verificarContrasena('no-es-un-hash-argon2', 'cualquiera')).resolves.toBe(false);
  });
});
