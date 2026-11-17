import type { TipoHistoria } from '../../../generado/prisma/enums.js';
import { esTipoAdulto } from './campos-por-tipo.js';
import type { DatosPersonales, DatosRepresentante } from './datos-personales.js';

export interface ErrorIdentificacion {
  campo: 'nombre' | 'apellido' | 'documento' | 'fechaNacimiento' | 'representante.cedula';
  mensaje: string;
}

type DatosIdentificacion = Pick<
  DatosPersonales,
  'nombre' | 'apellido' | 'nacionalidad' | 'cedula' | 'sinDocumento' | 'fechaNacimiento'
>;

// SPEC §7.1 y §9.2 (v1.3): datos obligatorios para crear o guardar la historia.
// Los textos son los del prototipo (B12). El backend los aplica aunque el
// frontend ya lo impida (RESUELTO v1.3).
export function validarIdentificacion(
  tipo: TipoHistoria,
  datos: DatosIdentificacion,
): ErrorIdentificacion[] {
  const errores: ErrorIdentificacion[] = [];

  if (!datos.nombre.trim()) {
    errores.push({
      campo: 'nombre',
      mensaje: 'Escribe el nombre. Es obligatorio para crear la historia.',
    });
  }
  if (!datos.apellido.trim()) {
    errores.push({
      campo: 'apellido',
      mensaje: 'Escribe el apellido. Es obligatorio para crear la historia.',
    });
  }

  if (esTipoAdulto(tipo)) {
    // RF-025: en adultos no existe "Sin documento" ni nacionalidad pendiente.
    if (datos.sinDocumento || !datos.nacionalidad || !datos.cedula) {
      errores.push({
        campo: 'documento',
        mensaje:
          'Escribe la nacionalidad y el número de cédula. Son obligatorios para crear la historia.',
      });
    }
  } else if (datos.sinDocumento) {
    // RF-004: infantil sin documento; la fecha de nacimiento pasa a ser
    // obligatoria porque identifica duplicados (§7.2).
    if (datos.cedula) {
      errores.push({
        campo: 'documento',
        mensaje: 'Si marcas "Sin documento", deja vacío el número de cédula.',
      });
    }
    if (!datos.fechaNacimiento) {
      errores.push({
        campo: 'fechaNacimiento',
        mensaje: 'Escribe la fecha de nacimiento. Sin documento, es obligatoria.',
      });
    }
  }

  if (datos.cedula && !/^\d{1,9}$/.test(datos.cedula)) {
    errores.push({
      campo: 'documento',
      mensaje: 'La cédula debe contener solo dígitos, máximo 9.',
    });
  }

  return errores;
}

/** SPEC §8.4: la cédula del representante, si se escribe, sigue el mismo formato. */
export function validarRepresentante(
  representante: DatosRepresentante | null,
): ErrorIdentificacion[] {
  if (representante?.cedula && !/^\d{1,9}$/.test(representante.cedula)) {
    return [
      {
        campo: 'representante.cedula',
        mensaje: 'La cédula del representante debe contener solo dígitos, máximo 9.',
      },
    ];
  }
  return [];
}
