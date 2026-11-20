// SPEC B v1.6 §8.4: antecedentes maternos, datos al nacer y exámenes realizados
// de la ficha de Rehabilitación infantil. Son datos personales del niño o niña
// (no de la valoración) y se piden en el orden de la ficha, después del
// representante y de los teléfonos.

export const CONTROL_PRENATAL = ['Sí', 'No'] as const;
export const ALIMENTACION = ['LME', 'LM + F', 'LM + Alimentación'] as const;

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
  tipoSangre: string | null;
  complicacionesMaternas: string | null;
  // Datos al nacer
  edadGestacional: number | null;
  /** Corrección manual de la edad cronológica; vacía = la calculada con la F.N. */
  edadCronologica: string | null;
  /** Corrección manual de la edad corregida; vacía = la calculada con la F.N. y la E.G. */
  edadCorregida: string | null;
  peso: string | null;
  talla: string | null;
  respiro: string | null;
  lloro: string | null;
  apgar: string | null;
  requirioO2: string | null;
  fototerapia: string | null;
  transfusiones: string | null;
  sdr: string | null;
  sepsisNeonatal: string | null;
  ictericia: string | null;
  anemia: string | null;
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
