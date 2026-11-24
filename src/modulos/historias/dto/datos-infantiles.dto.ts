import { z } from 'zod';
import {
  ALIMENTACION,
  CAMPOS_ENTEROS_INFANTILES,
  CAMPOS_INFANTILES,
  CAMPOS_SI_NO,
  CONTROL_PRENATAL,
  RANGOS_AL_NACER,
  SI_NO,
  TIPOS_SANGRE,
  type CampoInfantil,
} from '../dominio/datos-infantiles.js';

// SPEC B v1.6 §8.4: todos pueden quedar vacíos (la historia se guarda como
// Borrador); su falta solo impide iniciar la valoración.
const texto = (max: number) => z.string().max(max).nullable().optional();
const entero = (max: number) => z.number().int().min(0).max(max).nullable().optional();
const opcion = (opciones: readonly [string, ...string[]]) => z.enum(opciones).nullable().optional();

/** Decimal con coma o punto dentro de un rango; vacío se acepta (queda en null). */
function decimal({ min, max }: { min: number; max: number }) {
  const conComa = (n: number) => String(n).replace('.', ',');
  return z
    .string()
    .refine(
      (valor) => {
        const limpio = valor.trim();
        if (!limpio) return true;
        if (!/^\d+([.,]\d{1,2})?$/.test(limpio)) return false;
        const numero = Number(limpio.replace(',', '.'));
        return numero >= min && numero <= max;
      },
      `Escribe un número entre ${conComa(min)} y ${conComa(max)}.`,
    )
    .nullable()
    .optional();
}

const LARGOS: readonly CampoInfantil[] = [
  'embarazoOtras',
  'complicacionesMaternas',
  'neonatalOtros',
];

const forma = Object.fromEntries(
  CAMPOS_INFANTILES.map((campo) => {
    if (campo === 'controlPrenatal') return [campo, opcion(CONTROL_PRENATAL)];
    if (campo === 'alimentacion') return [campo, opcion(ALIMENTACION)];
    if (campo === 'tipoSangre') return [campo, opcion(TIPOS_SANGRE)];
    if ((CAMPOS_SI_NO as readonly CampoInfantil[]).includes(campo)) return [campo, opcion(SI_NO)];
    if (campo === 'peso' || campo === 'talla') return [campo, decimal(RANGOS_AL_NACER[campo])];
    if (campo === 'edadGestacional') return [campo, entero(45)];
    if ((CAMPOS_ENTEROS_INFANTILES as readonly CampoInfantil[]).includes(campo))
      return [campo, entero(30)];
    return [campo, texto(LARGOS.includes(campo) ? 500 : 150)];
  }),
) as Record<CampoInfantil, z.ZodType>;

export const esquemaDatosInfantiles = z.object(forma);

// Los valores se comprueban arriba; la normalización los lleva a su tipo.
export type DatosInfantilesDto = Partial<Record<CampoInfantil, unknown>>;
