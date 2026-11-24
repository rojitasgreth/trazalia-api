// SPEC B v1.6 §8.4: antecedentes maternos, datos al nacer y exámenes realizados
// de la ficha de Rehabilitación infantil. Son datos personales del niño o niña
// (no de la valoración) y se piden en el orden de la ficha, después del
// representante y de los teléfonos.

export const SI_NO = ['Sí', 'No'] as const;
export const CONTROL_PRENATAL = SI_NO;
export const ALIMENTACION = ['LME', 'LM + F', 'LM + Alimentación'] as const;
export const TIPOS_SANGRE = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'] as const;

type SiNo = (typeof SI_NO)[number];

/** Datos al nacer que se responden con Sí o No (decisión del 24-11-2026). */
export const CAMPOS_SI_NO = [
  'respiro',
  'lloro',
  'requirioO2',
  'fototerapia',
  'sdr',
  'sepsisNeonatal',
  'ictericia',
  'anemia',
] as const;

/** Peso (kg) y talla (cm) al nacer: decimales con coma, en un rango amplio. */
export const RANGOS_AL_NACER = {
  peso: { min: 0.3, max: 7 },
  talla: { min: 20, max: 70 },
} as const;

/** Datos infantiles ya normalizados (vacío = null). */
export interface DatosInfantiles {
  // Antecedentes maternos
  controlPrenatal: (typeof CONTROL_PRENATAL)[number] | null;
  controlPrenatalDesde: string | null;
  gestas: number | null;
  formulaP: number | null;
  formulaF: number | null;
  formulaC: number | null;
  formulaA: number | null;
  infeccionesUrinarias: string | null;
  hemorragias: string | null;
  infeccionesVaginales: string | null;
  embarazoOtras: string | null;
  enfermedadBase: string | null;
  medicamentos: string | null;
  consumoAlcohol: string | null;
  consumoTabaco: string | null;
  consumoOtros: string | null;
  tipoSangre: (typeof TIPOS_SANGRE)[number] | null;
  complicacionesMaternas: string | null;
  // Datos al nacer
  edadGestacional: number | null;
  /** Corrección manual de la edad cronológica; vacía = la calculada con la F.N. */
  edadCronologica: string | null;
  /** Corrección manual de la edad corregida; vacía = la calculada con la F.N. y la E.G. */
  edadCorregida: string | null;
  /** En kg, con coma decimal ("3,2"). */
  peso: string | null;
  /** En cm, con coma decimal ("50" o "49,5"). */
  talla: string | null;
  respiro: SiNo | null;
  lloro: SiNo | null;
  apgar: string | null;
  requirioO2: SiNo | null;
  fototerapia: SiNo | null;
  transfusiones: string | null;
  sdr: SiNo | null;
  sepsisNeonatal: SiNo | null;
  ictericia: SiNo | null;
  anemia: SiNo | null;
  neonatalOtros: string | null;
  vacunas: string | null;
  alimentacion: (typeof ALIMENTACION)[number] | null;
  // Exámenes realizados
  pesquisaNeonatal: string | null;
  emisionesOtoacusticas: string | null;
  ecoCerebral: string | null;
  ecoAbdominal: string | null;
  evaluadoCardiologia: string | null;
  evaluadoNeurologia: string | null;
  evaluadoOftalmologia: string | null;
}

export type CampoInfantil = keyof DatosInfantiles;

export const CAMPOS_ENTEROS_INFANTILES = [
  'gestas',
  'formulaP',
  'formulaF',
  'formulaC',
  'formulaA',
  'edadGestacional',
] as const satisfies readonly CampoInfantil[];

export const CAMPOS_INFANTILES: readonly CampoInfantil[] = [
  'controlPrenatal',
  'controlPrenatalDesde',
  'gestas',
  'formulaP',
  'formulaF',
  'formulaC',
  'formulaA',
  'infeccionesUrinarias',
  'hemorragias',
  'infeccionesVaginales',
  'embarazoOtras',
  'enfermedadBase',
  'medicamentos',
  'consumoAlcohol',
  'consumoTabaco',
  'consumoOtros',
  'tipoSangre',
  'complicacionesMaternas',
  'edadGestacional',
  'edadCronologica',
  'edadCorregida',
  'peso',
  'talla',
  'respiro',
  'lloro',
  'apgar',
  'requirioO2',
  'fototerapia',
  'transfusiones',
  'sdr',
  'sepsisNeonatal',
  'ictericia',
  'anemia',
  'neonatalOtros',
  'vacunas',
  'alimentacion',
  'pesquisaNeonatal',
  'emisionesOtoacusticas',
  'ecoCerebral',
  'ecoAbdominal',
  'evaluadoCardiologia',
  'evaluadoNeurologia',
  'evaluadoOftalmologia',
];

/**
 * SPEC B v1.6 §8.4 y RF-028: no se exigen para iniciar la valoración. Las dos
 * edades se calculan (la corrección es opcional), y Otras, Otros (dos veces),
 * Complicaciones y Transfusiones son opcionales según la ficha.
 */
export const CAMPOS_INFANTILES_OPCIONALES: readonly CampoInfantil[] = [
  'embarazoOtras',
  'consumoOtros',
  'complicacionesMaternas',
  'edadCronologica',
  'edadCorregida',
  'transfusiones',
  'neonatalOtros',
];

export function datosInfantilesVacios(): DatosInfantiles {
  return Object.fromEntries(
    CAMPOS_INFANTILES.map((campo) => [campo, null]),
  ) as unknown as DatosInfantiles;
}
