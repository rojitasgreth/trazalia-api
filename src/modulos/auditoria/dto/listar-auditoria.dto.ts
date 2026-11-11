import { z } from 'zod';

// BR-028/AC-027: paginación y filtros controlados para la consulta administrativa.
export const esquemaListarAuditoria = z.object({
  tipoEvento: z.string().trim().min(1).optional(),
  resultado: z.string().trim().min(1).optional(),
  idUsuario: z.string().uuid().optional(),
  // ISO 8601 (string): z.coerce.date() no es representable en JSON Schema
  // (lo necesita Swagger al introspeccionar el esquema de este DTO).
  desde: z.iso.datetime({ offset: true }).optional(),
  hasta: z.iso.datetime({ offset: true }).optional(),
  pagina: z.coerce.number().int().positive().default(1),
  porPagina: z.coerce.number().int().positive().max(100).default(20),
});

export type ListarAuditoriaDto = z.infer<typeof esquemaListarAuditoria>;
