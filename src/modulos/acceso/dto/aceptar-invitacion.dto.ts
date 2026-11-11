import { z } from 'zod';
import { esquemaContrasena } from '../dominio/esquema-contrasena.js';

// BR-011: la política de contraseñas vive en esquema-contrasena.ts (§8).
export const esquemaAceptarInvitacion = z.object({
  token: z.string().min(1, 'El token de invitación es obligatorio.'),
  contrasena: esquemaContrasena,
});

export type AceptarInvitacionDto = z.infer<typeof esquemaAceptarInvitacion>;
