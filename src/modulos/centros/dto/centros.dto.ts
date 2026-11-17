import { z } from 'zod';
import { ENTIDADES_FEDERALES } from '../../../compartido/catalogos/entidades-federales.js';

// SPEC B v1.4 §8.7: búsqueda mientras se escribe (mínimo 2 caracteres).
export const esquemaBuscarCentros = z.object({
  texto: z.string().trim().min(2).max(100),
});

// SPEC B v1.4 §8.7: datos del centro; la comunidad es opcional.
export const esquemaCrearCentro = z.object({
  nombre: z.string().trim().min(2, 'Escribe el nombre del centro.').max(150),
  dirEstado: z.enum(ENTIDADES_FEDERALES),
  dirMunicipio: z.string().trim().min(1, 'Escribe el municipio.').max(100),
  dirParroquia: z.string().trim().min(1, 'Escribe la parroquia.').max(100),
  dirComunidad: z.string().trim().max(200).nullable().optional(),
});

export type BuscarCentrosDto = z.infer<typeof esquemaBuscarCentros>;
export type CrearCentroDto = z.infer<typeof esquemaCrearCentro>;
