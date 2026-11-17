import type { ModalidadAtencion, TipoHistoria } from '../../../generado/prisma/enums.js';

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
  // SPEC v1.4 §8.6: modalidad de atención y centro médico (si es en centro).
  'modalidad',
  'idCentro',
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
    'modalidad',
    'dominancia',
    'ocupacion',
    'nivelEducativo',
    'telefono',
    ...CONTACTO,
  ],
  TRAUMA_ADULTO: [
    'fechaNacimiento',
    'sexo',
    'modalidad',
    'dominancia',
    'ocupacion',
    'demandasFisicas',
    'telefono',
    ...CONTACTO,
  ],
  ADULTO_MAYOR: [
    'fechaNacimiento',
    'sexo',
    'modalidad',
    'estadoCivil',
    'lugarNacimiento',
    'dominancia',
    'ocupacion',
    'nivelEducativo',
    'telefono',
    ...DIRECCION,
    ...CONTACTO,
  ],
  REHAB_INFANTIL: ['fechaNacimiento', 'sexo', 'modalidad', ...DIRECCION, 'telefono', 'correo'],
};

/** Campos que no se exigen para completar los datos personales (el correo es opcional). */
export const CAMPOS_OPCIONALES: readonly CampoPersonal[] = ['correo'];

// SPEC §8.2/§8.3/§10: fuente de información y demandas físicas solo existen
// en un tipo; no se copian al autocompletar ni se propagan.
// SPEC v1.4 §8.6: la modalidad y el centro son de cada historia; tampoco se comparten.
export const CAMPOS_NO_COMPARTIBLES: readonly CampoPersonal[] = [
  'fuenteInformacion',
  'demandasFisicas',
  'modalidad',
  'idCentro',
];

/** Tipos de adulto: documento (V/E + cédula) obligatorio, sin opción "Sin documento" (RF-025). */
export function esTipoAdulto(tipo: TipoHistoria): boolean {
  return tipo !== 'REHAB_INFANTIL';
}

/**
 * SPEC v1.4 §8.6: campos que aplican a una historia según su tipo y su
 * modalidad. A domicilio se necesita la dirección del paciente también en
 * Traumatología y Neurología; en centro, el centro médico.
 */
export function camposAplicables(
  tipo: TipoHistoria,
  modalidad: ModalidadAtencion | null,
): readonly CampoPersonal[] {
  const campos = [...CAMPOS_POR_TIPO[tipo]];
  if (modalidad === 'DOMICILIO') {
    for (const campo of DIRECCION) if (!campos.includes(campo)) campos.push(campo);
  }
  if (modalidad === 'CENTRO') campos.push('idCentro');
  return campos;
}

export function campoAplica(
  tipo: TipoHistoria,
  campo: CampoPersonal,
  modalidad: ModalidadAtencion | null = null,
): boolean {
  return camposAplicables(tipo, modalidad).includes(campo);
}
