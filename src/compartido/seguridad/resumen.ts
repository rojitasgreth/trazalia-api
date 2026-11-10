import { createHash, randomBytes } from 'node:crypto';

// Para tokens de un solo uso (invitación, recuperación) y jti de sesión: se
// guarda un resumen determinista (nunca el valor original) para poder buscarlo
// por igualdad. No es para contraseñas: ahí se usa Argon2id (ver contrasena.ts).
export function generarTokenAleatorio(): string {
  return randomBytes(32).toString('base64url');
}

export function resumir(valor: string): string {
  return createHash('sha256').update(valor).digest('hex');
}
