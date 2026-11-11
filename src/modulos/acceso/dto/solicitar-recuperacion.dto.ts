import { z } from 'zod';

// BR-013: la recuperación se solicita indicando el correo, nunca el nombre de usuario.
export const esquemaSolicitarRecuperacion = z.object({
  correo: z.email('El correo no tiene un formato válido.'),
});

export type SolicitarRecuperacionDto = z.infer<typeof esquemaSolicitarRecuperacion>;
