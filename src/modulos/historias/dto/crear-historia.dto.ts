import { z } from 'zod';
import { esquemaDatosPersonales } from './datos-personales.dto.js';
import { esquemaRepresentante } from './representante.dto.js';

export const TIPOS_HISTORIA = [
  'NEURO_ADULTO',
  'TRAUMA_ADULTO',
  'REHAB_INFANTIL',
  'ADULTO_MAYOR',
] as const;

// RF-002/RF-006: se crea con uno de los cuatro tipos y queda en Borrador. El
// propietario nunca viaja en el cuerpo: sale de la sesión (§4.1).
export const esquemaCrearHistoria = esquemaDatosPersonales.extend({
  tipo: z.enum(TIPOS_HISTORIA),
  // Solo Rehabilitación infantil; en los demás tipos se ignora.
  representante: esquemaRepresentante.nullable().optional(),
});

export type CrearHistoriaDto = z.infer<typeof esquemaCrearHistoria>;
