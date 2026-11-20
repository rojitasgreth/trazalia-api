import type { TipoHistoria } from '../../../generado/prisma/enums.js';
import { FICHA_ADULTO_MAYOR_V1 } from './adulto-mayor.js';
import type { Ficha } from './dsl.js';
import { FICHA_INFANTIL_V1 } from './infantil.js';
import { FICHA_NEURO_V1 } from './neuro.js';
import { FICHA_TRAUMA_V1 } from './trauma.js';

// ADR-0005: cada valoración guarda la versión de ficha con que se llenó. Una
// ficha nueva o modificada se agrega como versión nueva; las anteriores quedan
// para mostrar las valoraciones ya hechas con ellas.
const FICHAS: Record<TipoHistoria, Record<number, Ficha>> = {
  TRAUMA_ADULTO: { 1: FICHA_TRAUMA_V1 },
  NEURO_ADULTO: { 1: FICHA_NEURO_V1 },
  REHAB_INFANTIL: { 1: FICHA_INFANTIL_V1 },
  ADULTO_MAYOR: { 1: FICHA_ADULTO_MAYOR_V1 },
};

export const VERSION_ACTUAL: Record<TipoHistoria, number> = {
  TRAUMA_ADULTO: 1,
  NEURO_ADULTO: 1,
  REHAB_INFANTIL: 1,
  ADULTO_MAYOR: 1,
};

export function fichaDe(tipo: TipoHistoria, version = VERSION_ACTUAL[tipo]): Ficha {
  const ficha = FICHAS[tipo][version];
  if (!ficha) throw new Error(`No existe la ficha ${tipo} v${version}.`);
  return ficha;
}

export type { Ficha } from './dsl.js';
