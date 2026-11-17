import { z } from 'zod';
import { esquemaDatosPersonales } from './datos-personales.dto.js';
import { esquemaRepresentante } from './representante.dto.js';

// SPEC §13.1 y §10.2: edición de datos personales por el propietario. El
// cuerpo trae el formulario completo; `propagar` indica si los cambios de datos
// compartidos se aplican también a las demás historias no archivadas.
export const esquemaActualizarHistoria = esquemaDatosPersonales.extend({
  representante: esquemaRepresentante.nullable().optional(),
  propagar: z.boolean().default(false),
});

export type ActualizarHistoriaDto = z.infer<typeof esquemaActualizarHistoria>;
