import type { CentroMedico } from '../../../generado/prisma/client.js';

/** Lo que se muestra de un centro: nunca quién lo registró (ADR-0004). */
export interface CentroPublico {
  idCentro: string;
  nombre: string;
  estado: string;
  municipio: string;
  parroquia: string;
  comunidad: string | null;
}

export function aCentroPublico(centro: CentroMedico): CentroPublico {
  return {
    idCentro: centro.idCentro,
    nombre: centro.nombre,
    estado: centro.dirEstado,
    municipio: centro.dirMunicipio,
    parroquia: centro.dirParroquia,
    comunidad: centro.dirComunidad,
  };
}
