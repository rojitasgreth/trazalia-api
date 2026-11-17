import { z } from 'zod';
import { TIPOS_HISTORIA } from './crear-historia.dto.js';

// SPEC §12.3 / RF-023 y Documento Cero §8: filtros controlados y paginación.
export const esquemaListarHistorias = z.object({
  texto: z.string().trim().min(1).max(100).optional(),
  tipo: z.enum(TIPOS_HISTORIA).optional(),
  estado: z.enum(['BORRADOR', 'ACTIVA']).optional(),
  // Apartado específico de Archivadas (§12.4): el listado principal las excluye.
  archivadas: z.enum(['true', 'false']).default('false'),
  creadaDesde: z.iso.date().optional(),
  creadaHasta: z.iso.date().optional(),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(20),
});

export type ListarHistoriasDto = z.infer<typeof esquemaListarHistorias>;
