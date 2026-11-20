import { z } from 'zod';
import {
  ALIMENTACION,
  CAMPOS_ENTEROS_INFANTILES,
  CAMPOS_INFANTILES,
  CONTROL_PRENATAL,
  type CampoInfantil,
} from '../dominio/datos-infantiles.js';

// SPEC B v1.6 §8.4: todos pueden quedar vacíos (la historia se guarda como
// Borrador); su falta solo impide iniciar la valoración.
const texto = (max: number) => z.string().max(max).nullable().optional();
const entero = (max: number) => z.number().int().min(0).max(max).nullable().optional();

const LARGOS: readonly CampoInfantil[] = [
  'embarazoOtras',
  'complicacionesMaternas',
  'neonatalOtros',
];

const forma = Object.fromEntries(
  CAMPOS_INFANTILES.map((campo) => {
    if (campo === 'controlPrenatal') return [campo, z.enum(CONTROL_PRENATAL).nullable().optional()];
    if (campo === 'alimentacion') return [campo, z.enum(ALIMENTACION).nullable().optional()];
    if (campo === 'edadGestacional') return [campo, entero(45)];
    if ((CAMPOS_ENTEROS_INFANTILES as readonly CampoInfantil[]).includes(campo))
      return [campo, entero(30)];
    return [campo, texto(LARGOS.includes(campo) ? 500 : 150)];
  }),
) as Record<CampoInfantil, z.ZodType>;

export const esquemaDatosInfantiles = z.object(forma);

// Los valores se comprueban arriba; la normalización los lleva a su tipo.
export type DatosInfantilesDto = Partial<Record<CampoInfantil, unknown>>;
