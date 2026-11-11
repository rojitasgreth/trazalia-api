import { z } from 'zod';

// Documento Cero §8: paginación, ordenamiento y filtros controlados en listados.
export const esquemaListarUsuarios = z.object({
  texto: z.string().trim().min(1).optional(),
  rol: z.enum(['ADMINISTRADOR', 'FISIOTERAPEUTA']).optional(),
  estado: z.enum(['PENDIENTE', 'ACTIVO', 'BLOQUEADO', 'SUSPENDIDO', 'INACTIVO']).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(20),
});

export type ListarUsuariosDto = z.infer<typeof esquemaListarUsuarios>;
