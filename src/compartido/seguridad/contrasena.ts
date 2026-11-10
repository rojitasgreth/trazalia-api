import { hash, verify } from '@node-rs/argon2';

// BR-012: hash adaptativo con salt único, Argon2id. @node-rs/argon2 ya usa
// Argon2id y genera un salt aleatorio por defecto.
export async function hashearContrasena(contrasena: string): Promise<string> {
  return hash(contrasena);
}

export async function verificarContrasena(
  hashAlmacenado: string,
  contrasena: string,
): Promise<boolean> {
  try {
    return await verify(hashAlmacenado, contrasena);
  } catch {
    return false;
  }
}
