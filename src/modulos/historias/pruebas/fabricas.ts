import {
  CAMPOS_ENTEROS_INFANTILES,
  CAMPOS_INFANTILES,
  CAMPOS_INFANTILES_OPCIONALES,
  datosInfantilesVacios,
  type DatosInfantiles,
} from '../dominio/datos-infantiles.js';
// Datos de prueba compartidos por las pruebas unitarias del módulo.
import type { CentrosServicio } from '../../centros/centros.servicio.js';
import type { CentroPublico } from '../../centros/vista/centro-publico.js';
import type { DatosPersonales } from '../dominio/datos-personales.js';
import type { HistoriaConRepresentante } from '../repositorios/historia.repositorio.js';

export const ID_CENTRO = '7d1c5e2a-0000-4000-8000-0000000000c1';

/** Carlos Andrade, Traumatología del adulto, completo (prototipo B07/B23), atendido en un centro. */
export function datosCarlos(cambios: Partial<DatosPersonales> = {}): DatosPersonales {
  return {
    nombre: 'Carlos',
    apellido: 'Andrade',
    nacionalidad: 'V',
    cedula: '15482301',
    sinDocumento: false,
    fechaNacimiento: '1985-03-14',
    sexo: 'MASCULINO',
    dominancia: 'Diestro(a)',
    ocupacion: 'Contador · fútbol amateur',
    nivelEducativo: null,
    estadoCivil: null,
    lugarNacimiento: null,
    telefono: '04125550134',
    correo: null,
    dirEstado: null,
    dirMunicipio: null,
    dirParroquia: null,
    dirComunidad: null,
    contactoNombre: 'Patricia Andrade',
    contactoParentesco: 'Esposa',
    contactoTelefono: '04145552290',
    demandasFisicas: 'Oficina sentado 8 h al día',
    fuenteInformacion: [],
    modalidad: 'CENTRO',
    idCentro: ID_CENTRO,
    ...cambios,
  };
}

export function filaHistoria(
  cambios: Partial<HistoriaConRepresentante> = {},
): HistoriaConRepresentante {
  const datos = datosCarlos();
  return {
    idHistoria: 'h1',
    idPaciente: 'p1',
    idFisioterapeuta: 'f1',
    tipo: 'TRAUMA_ADULTO',
    estado: 'BORRADOR',
    archivada: false,
    fechaArchivo: null,
    ...datos,
    fechaNacimiento: new Date('1985-03-14T00:00:00.000Z'),
    fechaCreacion: new Date('2026-11-16T12:00:00.000Z'),
    fechaActualizacion: new Date('2026-11-16T12:00:00.000Z'),
    representante: null,
    datosInfantiles: null,
    ...cambios,
  };
}

export const CENTRO: CentroPublico = {
  idCentro: ID_CENTRO,
  nombre: 'Clínica Santa Sofía',
  estado: 'Miranda',
  municipio: 'Sucre',
  parroquia: 'Petare',
  comunidad: null,
};

/** CentrosServicio de prueba: solo conoce los centros indicados. */
export function centrosFalsos(centros: CentroPublico[] = [CENTRO]): CentrosServicio {
  return {
    obtener: vi.fn((ids: readonly string[]) =>
      Promise.resolve(
        new Map(centros.filter((c) => ids.includes(c.idCentro)).map((c) => [c.idCentro, c])),
      ),
    ),
  } as unknown as CentrosServicio;
}

/** v1.6 §8.4: antecedentes maternos, datos al nacer y exámenes completos (sin los opcionales). */
export function infantilesCompletos(cambios: Partial<DatosInfantiles> = {}): DatosInfantiles {
  const datos = datosInfantilesVacios();
  for (const campo of CAMPOS_INFANTILES) {
    if (CAMPOS_INFANTILES_OPCIONALES.includes(campo)) continue;
    (datos as unknown as Record<string, unknown>)[campo] = (
      CAMPOS_ENTEROS_INFANTILES as readonly string[]
    ).includes(campo)
      ? 1
      : 'Sí';
  }
  datos.edadGestacional = 38;
  datos.alimentacion = 'LME';
  return { ...datos, ...cambios };
}
