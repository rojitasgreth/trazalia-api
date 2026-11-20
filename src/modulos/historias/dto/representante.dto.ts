import { z } from 'zod';
import { ESTADOS_CIVILES, NIVELES_EDUCATIVOS } from '../dominio/catalogos.js';

// SPEC §8.4: representante único (madre o padre) de Rehabilitación infantil.
// Todos los campos pueden quedar vacíos: la historia se guarda como Borrador
// sin representante, pero no podrá iniciarse la valoración (RF-015/RF-016).
// v1.6: la ficha pide la edad (número), no la fecha de nacimiento.
export const esquemaRepresentante = z.object({
  parentesco: z.enum(['MADRE', 'PADRE']).nullable().optional(),
  nombre: z.string().max(100).nullable().optional(),
  apellido: z.string().max(100).nullable().optional(),
  cedula: z.string().max(15).nullable().optional(),
  edad: z.number().int().min(0).max(120).nullable().optional(),

  estadoCivil: z.enum(ESTADOS_CIVILES).nullable().optional(),
  gradoInstruccion: z.enum(NIVELES_EDUCATIVOS).nullable().optional(),
  ocupacion: z.string().max(150).nullable().optional(),
});

export type RepresentanteDto = z.infer<typeof esquemaRepresentante>;
