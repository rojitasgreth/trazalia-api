import type { Nacionalidad } from '../../../generado/prisma/enums.js';

// BR-005: el nombre de usuario nunca lo elige la persona; se genera
// concatenando nacionalidad (V/E) y cédula, p. ej. V29921795.
export function generarNombreUsuario(nacionalidad: Nacionalidad, cedula: string): string {
  return `${nacionalidad}${cedula}`;
}
