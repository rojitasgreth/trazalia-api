import { z } from 'zod';

// BR-010: no se valida formato aquí a propósito — el mensaje de credenciales
// inválidas debe ser genérico (AC-010) y no debe filtrar reglas de contraseña.
export const esquemaIniciarSesion = z.object({
  identificador: z.string().min(1, 'El correo o nombre de usuario es obligatorio.'),
  contrasena: z.string().min(1, 'La contraseña es obligatoria.'),
  etiquetaDispositivo: z.string().max(200).optional(),
});

export type IniciarSesionDto = z.infer<typeof esquemaIniciarSesion>;
