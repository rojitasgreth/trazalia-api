import { z } from 'zod';

// El contenido se valida campo a campo contra la ficha en el caso de uso
// (dominio/contenido.ts); aquí solo la forma general y el tamaño.
export const esquemaGuardarValoracion = z.object({
  contenido: z
    .record(z.string().max(200), z.unknown())
    .refine((c) => Object.keys(c).length <= 5000, { message: 'Demasiados campos.' }),
  version: z.number().int().min(1),
});

export const esquemaFinalizarValoracion = z.object({ version: z.number().int().min(1) });
