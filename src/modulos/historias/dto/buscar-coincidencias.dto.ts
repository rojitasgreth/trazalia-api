import { z } from 'zod';
import { TIPOS_HISTORIA } from './crear-historia.dto.js';

// B13/B14: datos de identificación para buscar el mismo paciente antes de
// guardar. Va en el cuerpo (POST) para no dejar cédulas en URLs ni en logs.
export const esquemaBuscarCoincidencias = z.object({
  tipo: z.enum(TIPOS_HISTORIA),
  nombre: z.string().max(100).optional(),
  apellido: z.string().max(100).optional(),
  nacionalidad: z.enum(['V', 'E']).nullable().optional(),
  cedula: z.string().max(15).nullable().optional(),
  sinDocumento: z.boolean().optional(),
  fechaNacimiento: z.iso.date().nullable().optional(),
});

export type BuscarCoincidenciasDto = z.infer<typeof esquemaBuscarCoincidencias>;
