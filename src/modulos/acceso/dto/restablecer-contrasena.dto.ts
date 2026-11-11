import { z } from 'zod';
import { esquemaContrasena } from '../dominio/esquema-contrasena.js';

// BR-013/014.
export const esquemaRestablecerContrasena = z.object({
  token: z.string().min(1, 'El token de recuperación es obligatorio.'),
  contrasena: esquemaContrasena,
});

export type RestablecerContrasenaDto = z.infer<typeof esquemaRestablecerContrasena>;
