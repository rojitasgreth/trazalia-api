import { z } from 'zod';
import {
  DOMINANCIAS,
  ENTIDADES_FEDERALES,
  ESTADOS_CIVILES,
  FUENTES_INFORMACION,
  NIVELES_EDUCATIVOS,
} from '../dominio/catalogos.js';

// Límites de forma y de catálogo. Las reglas que dependen del tipo de historia
// (obligatoriedad, "Sin documento") viven en dominio/identificacion.ts, para
// devolver los mensajes del prototipo y no los genéricos de Zod.
function texto(max: number) {
  return z.string().max(max).nullable().optional();
}

const fechaPasada = z.iso.date().refine((fecha) => fecha <= new Date().toISOString().slice(0, 10), {
  message: 'La fecha de nacimiento no puede ser futura.',
});

export const esquemaDatosPersonales = z.object({
  nombre: z.string().max(100),
  apellido: z.string().max(100),
  nacionalidad: z.enum(['V', 'E']).nullable().optional(),
  cedula: texto(15),
  sinDocumento: z.boolean().optional(),
  fechaNacimiento: fechaPasada.nullable().optional(),
  sexo: z.enum(['FEMENINO', 'MASCULINO']).nullable().optional(),
  dominancia: z.enum(DOMINANCIAS).nullable().optional(),
  ocupacion: texto(150),
  nivelEducativo: z.enum(NIVELES_EDUCATIVOS).nullable().optional(),
  estadoCivil: z.enum(ESTADOS_CIVILES).nullable().optional(),
  lugarNacimiento: texto(150),
  telefono: z
    .string()
    .max(30)
    .regex(/^[\d\s+()-]*$/, 'El teléfono solo admite dígitos, espacios y + ( ) -.')
    .nullable()
    .optional(),
  correo: z.email('El correo no tiene un formato válido.').max(254).nullable().optional(),
  dirEstado: z.enum(ENTIDADES_FEDERALES).nullable().optional(),
  dirMunicipio: texto(100),
  dirParroquia: texto(100),
  dirComunidad: texto(200),
  contactoNombre: texto(150),
  contactoParentesco: texto(60),
  contactoTelefono: z
    .string()
    .max(30)
    .regex(/^[\d\s+()-]*$/, 'El teléfono solo admite dígitos, espacios y + ( ) -.')
    .nullable()
    .optional(),
  demandasFisicas: texto(1000),
  fuenteInformacion: z.array(z.enum(FUENTES_INFORMACION)).max(4).optional(),
});

export type DatosPersonalesDto = z.infer<typeof esquemaDatosPersonales>;
