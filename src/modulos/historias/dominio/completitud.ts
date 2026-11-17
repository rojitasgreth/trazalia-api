import type { EstadoHistoria, TipoHistoria } from '../../../generado/prisma/enums.js';
import { CAMPOS_OPCIONALES, camposAplicables } from './campos-por-tipo.js';
import {
  CAMPOS_REPRESENTANTE,
  type DatosPersonales,
  type DatosRepresentante,
} from './datos-personales.js';

function vacio(valor: unknown): boolean {
  return (
    valor === null ||
    valor === undefined ||
    valor === '' ||
    (Array.isArray(valor) && valor.length === 0)
  );
}

/**
 * SPEC §9.1: qué datos faltan para completar la sección personal. Devuelve
 * claves de campo (`documento`, `telefono`, `representante.nombre`…); las
 * etiquetas visibles son responsabilidad de la interfaz.
 */
export function calcularCamposFaltantes(
  tipo: TipoHistoria,
  datos: DatosPersonales,
  representante: DatosRepresentante | null,
): string[] {
  const faltantes: string[] = [];

  if (!datos.cedula && !datos.sinDocumento) {
    faltantes.push('documento');
  }
  // v1.4 §8.6: la modalidad decide si cuentan la dirección o el centro.
  for (const campo of camposAplicables(tipo, datos.modalidad)) {
    if (!CAMPOS_OPCIONALES.includes(campo) && vacio(datos[campo])) {
      faltantes.push(campo);
    }
  }

  // RF-015: en infantil el representante (uno solo) es obligatorio para
  // completar los datos personales.
  if (tipo === 'REHAB_INFANTIL') {
    for (const campo of CAMPOS_REPRESENTANTE) {
      if (!representante || vacio(representante[campo])) {
        faltantes.push(`representante.${campo}`);
      }
    }
  }

  return faltantes;
}

/**
 * SPEC §6 pasos 11–12 y RF-016: la primera valoración se habilita con los datos
 * personales completos (en infantil, con el representante registrado).
 */
export function puedeIniciarValoracion(
  estado: EstadoHistoria,
  archivada: boolean,
  camposFaltantes: readonly string[],
): boolean {
  return estado === 'BORRADOR' && !archivada && camposFaltantes.length === 0;
}
