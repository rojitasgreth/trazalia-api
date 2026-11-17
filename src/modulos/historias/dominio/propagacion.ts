import type { TipoHistoria } from '../../../generado/prisma/enums.js';
import {
  CAMPOS_NO_COMPARTIBLES,
  CAMPOS_PERSONALES,
  campoAplica,
  esTipoAdulto,
  type CampoPersonal,
} from './campos-por-tipo.js';
import type { DatosPersonales } from './datos-personales.js';

/** SPEC §10.2: datos personales que pueden propagarse a otras historias del paciente. */
export const CAMPOS_COMPARTIDOS = [
  'nombre',
  'apellido',
  'nacionalidad',
  'cedula',
  ...CAMPOS_PERSONALES.filter((c) => !CAMPOS_NO_COMPARTIBLES.includes(c)),
] as const satisfies readonly (keyof DatosPersonales)[];

export type CampoCompartido = (typeof CAMPOS_COMPARTIDOS)[number];

/** Campos compartidos cuyo valor cambió en la edición (§10.2, AC-010). */
export function camposCambiados(
  antes: DatosPersonales,
  despues: DatosPersonales,
): CampoCompartido[] {
  return CAMPOS_COMPARTIDOS.filter((campo) => antes[campo] !== despues[campo]);
}

interface Destino {
  tipo: TipoHistoria;
  sinDocumento: boolean;
}

/**
 * Cambios que recibe otra historia del mismo paciente: solo los campos que
 * existen en la ficha de su tipo (decisión ADR-0002). El documento se copia
 * completo (nacionalidad + cédula) y solo si deja a la otra historia en un
 * estado válido: los adultos no admiten nacionalidad pendiente (RF-025).
 */
export function cambiosParaOtraHistoria(
  campos: readonly CampoCompartido[],
  datos: DatosPersonales,
  destino: Destino,
): Partial<DatosPersonales> {
  const cambios: Partial<DatosPersonales> = {};
  for (const campo of campos) {
    if (campo === 'nombre' || campo === 'apellido') {
      cambios[campo] = datos[campo];
    } else if (campo !== 'nacionalidad' && campo !== 'cedula' && campoAplica(destino.tipo, campo)) {
      (cambios as Record<CampoPersonal, unknown>)[campo] = datos[campo];
    }
  }

  const cambioDocumento = campos.includes('nacionalidad') || campos.includes('cedula');
  const documentoValido = esTipoAdulto(destino.tipo)
    ? !!datos.nacionalidad && !!datos.cedula
    : !!datos.cedula;
  if (cambioDocumento && documentoValido) {
    cambios.nacionalidad = datos.nacionalidad;
    cambios.cedula = datos.cedula;
    // Una historia infantil "Sin documento" deja de serlo al recibir la cédula.
    if (destino.sinDocumento) cambios.sinDocumento = false;
  }
  return cambios;
}
