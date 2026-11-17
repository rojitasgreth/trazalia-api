import type { TipoHistoria } from '../../../generado/prisma/enums.js';

/** Campos personales planos de una historia (sin el documento ni el representante). */
export const CAMPOS_PERSONALES = [
  'fechaNacimiento',
  'sexo',
  'dominancia',
  'ocupacion',
  'nivelEducativo',
  'estadoCivil',
  'lugarNacimiento',
  'telefono',
  'correo',
  'dirEstado',
  'dirMunicipio',
  'dirParroquia',
  'dirComunidad',
  'contactoNombre',
  'contactoParentesco',
  'contactoTelefono',
  'demandasFisicas',
  'fuenteInformacion',
] as const;

export type CampoPersonal = (typeof CAMPOS_PERSONALES)[number];

const CONTACTO = ['contactoNombre', 'contactoParentesco', 'contactoTelefono'] as const;
const DIRECCION = ['dirEstado', 'dirMunicipio', 'dirParroquia', 'dirComunidad'] as const;

// SPEC §8.2–§8.5: qué campos personales muestra la ficha de cada tipo.
// Nombre, apellido y documento aplican siempre y se tratan aparte.
export const CAMPOS_POR_TIPO: Record<TipoHistoria, readonly CampoPersonal[]> = {
  NEURO_ADULTO: [
    'fechaNacimiento',
    'sexo',
    'fuenteInformacion',
    'dominancia',
    'ocupacion',
    'nivelEducativo',
    'telefono',
    ...CONTACTO,
  ],
  TRAUMA_ADULTO: [
    'fechaNacimiento',
    'sexo',
    'dominancia',
    'ocupacion',
    'demandasFisicas',
    'telefono',
    ...CONTACTO,
  ],
  ADULTO_MAYOR: [
    'fechaNacimiento',
    'sexo',
    'estadoCivil',
    'lugarNacimiento',
    'dominancia',
    'ocupacion',
    'nivelEducativo',
    'telefono',
    ...DIRECCION,
    ...CONTACTO,
  ],
  REHAB_INFANTIL: ['fechaNacimiento', 'sexo', ...DIRECCION, 'telefono', 'correo'],
};

/** Campos que no se exigen para completar los datos personales (el correo es opcional). */
export const CAMPOS_OPCIONALES: readonly CampoPersonal[] = ['correo'];

// SPEC §8.2/§8.3/§10: fuente de información y demandas físicas solo existen
// en un tipo; no se copian al autocompletar ni se propagan.
export const CAMPOS_NO_COMPARTIBLES: readonly CampoPersonal[] = [
  'fuenteInformacion',
  'demandasFisicas',
];

/** Tipos de adulto: documento (V/E + cédula) obligatorio, sin opción "Sin documento" (RF-025). */
export function esTipoAdulto(tipo: TipoHistoria): boolean {
  return tipo !== 'REHAB_INFANTIL';
}

export function campoAplica(tipo: TipoHistoria, campo: CampoPersonal): boolean {
  return CAMPOS_POR_TIPO[tipo].includes(campo);
}
