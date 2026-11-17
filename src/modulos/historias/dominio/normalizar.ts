import type { TipoHistoria } from '../../../generado/prisma/enums.js';
import type { DatosPersonalesDto } from '../dto/datos-personales.dto.js';
import type { RepresentanteDto } from '../dto/representante.dto.js';
import { CAMPOS_PERSONALES, campoAplica, esTipoAdulto } from './campos-por-tipo.js';
import {
  normalizarCedula,
  textoONulo,
  type DatosPersonales,
  type DatosRepresentante,
} from './datos-personales.js';

/**
 * Lleva la entrada del formulario a la forma persistida para el tipo indicado:
 * textos recortados (vacío = null), cédula solo con dígitos y los campos que
 * la ficha del tipo no contempla anulados (SPEC §9.1).
 */
export function normalizarDatosPersonales(
  tipo: TipoHistoria,
  entrada: DatosPersonalesDto,
): DatosPersonales {
  // RF-025: "Sin documento" solo existe en infantil; en adultos se ignora y la
  // validación exigirá el documento.
  const sinDocumento = !esTipoAdulto(tipo) && entrada.sinDocumento === true;

  const datos: DatosPersonales = {
    nombre: entrada.nombre.trim(),
    apellido: entrada.apellido.trim(),
    nacionalidad: sinDocumento ? null : (entrada.nacionalidad ?? null),
    cedula: normalizarCedula(entrada.cedula),
    sinDocumento,
    fechaNacimiento: entrada.fechaNacimiento ?? null,
    sexo: entrada.sexo ?? null,
    dominancia: entrada.dominancia ?? null,
    ocupacion: textoONulo(entrada.ocupacion),
    nivelEducativo: entrada.nivelEducativo ?? null,
    estadoCivil: entrada.estadoCivil ?? null,
    lugarNacimiento: textoONulo(entrada.lugarNacimiento),
    telefono: textoONulo(entrada.telefono),
    correo: textoONulo(entrada.correo),
    dirEstado: entrada.dirEstado ?? null,
    dirMunicipio: textoONulo(entrada.dirMunicipio),
    dirParroquia: textoONulo(entrada.dirParroquia),
    dirComunidad: textoONulo(entrada.dirComunidad),
    contactoNombre: textoONulo(entrada.contactoNombre),
    contactoParentesco: textoONulo(entrada.contactoParentesco),
    contactoTelefono: textoONulo(entrada.contactoTelefono),
    demandasFisicas: textoONulo(entrada.demandasFisicas),
    fuenteInformacion: [...new Set(entrada.fuenteInformacion ?? [])],
  };

  for (const campo of CAMPOS_PERSONALES) {
    if (!campoAplica(tipo, campo)) {
      if (campo === 'fuenteInformacion') datos.fuenteInformacion = [];
      else datos[campo] = null;
    }
  }
  return datos;
}

/**
 * SPEC §8.4: el representante solo existe en Rehabilitación infantil. Un
 * representante sin ningún dato equivale a no tenerlo (null).
 */
export function normalizarRepresentante(
  tipo: TipoHistoria,
  entrada: RepresentanteDto | null | undefined,
): DatosRepresentante | null {
  if (tipo !== 'REHAB_INFANTIL' || !entrada) return null;
  const representante: DatosRepresentante = {
    parentesco: entrada.parentesco ?? null,
    nombre: textoONulo(entrada.nombre),
    apellido: textoONulo(entrada.apellido),
    cedula: normalizarCedula(entrada.cedula),
    fechaNacimiento: entrada.fechaNacimiento ?? null,
    estadoCivil: entrada.estadoCivil ?? null,
    gradoInstruccion: entrada.gradoInstruccion ?? null,
    ocupacion: textoONulo(entrada.ocupacion),
  };
  return Object.values(representante).some((valor) => valor !== null) ? representante : null;
}
