import { BadRequestException } from '@nestjs/common';
import type { CentrosServicio } from '../../centros/centros.servicio.js';
import type { CentroPublico } from '../../centros/vista/centro-publico.js';

/**
 * SPEC v1.4 §8.7: el centro de una historia se consulta en el módulo centros
 * (catálogo compartido) por su servicio público; nunca por su tabla.
 */
export async function centroDeHistoria(
  centros: CentrosServicio,
  idCentro: string | null,
): Promise<CentroPublico | null> {
  if (!idCentro) return null;
  return (await centros.obtener([idCentro])).get(idCentro) ?? null;
}

/** RF-030: el centro elegido debe existir en el catálogo. */
export async function exigirCentroExistente(
  centros: CentrosServicio,
  idCentro: string | null,
): Promise<CentroPublico | null> {
  const centro = await centroDeHistoria(centros, idCentro);
  if (idCentro && !centro) {
    throw new BadRequestException({
      mensaje: 'El centro médico seleccionado no existe.',
      errores: [{ campo: 'centro', mensaje: 'El centro médico seleccionado no existe.' }],
    });
  }
  return centro;
}
