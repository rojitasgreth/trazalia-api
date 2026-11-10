import { z } from 'zod';

// BR-011: mínimo 8, sin espacios, se permite Unicode/símbolos/números. 128
// como tope razonable contra abuso (spec §14), sin truncar silenciosamente.
export const esquemaAceptarInvitacion = z.object({
  token: z.string().min(1, 'El token de invitación es obligatorio.'),
  contrasena: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .max(128, 'La contraseña no puede exceder 128 caracteres.')
    .refine((valor) => !/\s/.test(valor), 'La contraseña no puede contener espacios.'),
});

export type AceptarInvitacionDto = z.infer<typeof esquemaAceptarInvitacion>;
