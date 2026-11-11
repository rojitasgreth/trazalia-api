import { z } from 'zod';

// BR-034: nacionalidad, cédula y nombre de usuario no son editables. El rol
// se valida aquí a nivel de forma; BR-033 (autoprotección) se aplica en el
// caso de uso, no en el esquema.
export const esquemaActualizarUsuario = z
  .object({
    nombre: z.string().trim().min(1).optional(),
    apellido: z.string().trim().min(1).optional(),
    telefono: z.string().trim().min(1).nullable().optional(),
    correo: z.email('El correo no tiene un formato válido.').optional(),
    rol: z.enum(['ADMINISTRADOR', 'FISIOTERAPEUTA']).optional(),
  })
  .refine(
    (datos) => Object.keys(datos).length > 0,
    'Debe incluir al menos un campo para actualizar.',
  );

export type ActualizarUsuarioDto = z.infer<typeof esquemaActualizarUsuario>;
