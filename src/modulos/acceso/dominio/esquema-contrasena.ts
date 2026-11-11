import { z } from 'zod';

// §8 (política de contraseñas): 8 a 32 caracteres, sin espacios, se permite
// Unicode/símbolos/números sin reglas artificiales de composición.
export const esquemaContrasena = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(32, 'La contraseña no puede exceder 32 caracteres.')
  .refine((valor) => !/\s/.test(valor), 'La contraseña no puede contener espacios.');
