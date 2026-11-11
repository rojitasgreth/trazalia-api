import { z } from 'zod';

// BR-003/BR-004: campos obligatorios para crear una invitación; la cédula es
// solo dígitos (máximo 9) y la nacionalidad define el prefijo del nombre de
// usuario (BR-005), que se genera en el servidor y nunca se recibe aquí.
export const esquemaCrearUsuario = z.object({
  nacionalidad: z.enum(['V', 'E']),
  cedula: z.string().regex(/^\d{1,9}$/, 'La cédula debe contener solo dígitos, máximo 9.'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.'),
  apellido: z.string().trim().min(1, 'El apellido es obligatorio.'),
  correo: z.email('El correo no tiene un formato válido.'),
  telefono: z.string().trim().min(1).optional(),
  rol: z.enum(['ADMINISTRADOR', 'FISIOTERAPEUTA']),
});

export type CrearUsuarioDto = z.infer<typeof esquemaCrearUsuario>;
