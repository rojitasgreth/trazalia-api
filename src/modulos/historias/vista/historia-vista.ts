import type {
  EstadoHistoria,
  NacionalidadPaciente,
  TipoHistoria,
} from '../../../generado/prisma/enums.js';
import type { CentroPublico } from '../../centros/vista/centro-publico.js';
import { calcularCamposFaltantes, puedeIniciarValoracion } from '../dominio/completitud.js';
import { CAMPOS_INFANTILES, type DatosInfantiles } from '../dominio/datos-infantiles.js';
import type { DatosPersonales, DatosRepresentante } from '../dominio/datos-personales.js';
import {
  deFechaBd,
  type HistoriaConRepresentante,
  type HistoriaDelPaciente,
} from '../repositorios/historia.repositorio.js';

/** Fila del listado (RF-022). La edad no se envía: se calcula al mostrarla (§16). */
export interface HistoriaResumen {
  idHistoria: string;
  tipo: TipoHistoria;
  estado: EstadoHistoria;
  archivada: boolean;
  nombre: string;
  apellido: string;
  nacionalidad: NacionalidadPaciente | null;
  cedula: string | null;
  sinDocumento: boolean;
  telefono: string | null;
  fechaNacimiento: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaArchivo: string | null;
}

export interface HistoriaDetalle extends HistoriaResumen {
  datos: DatosPersonales;
  representante: DatosRepresentante | null;
  /** v1.6 §8.4: solo en Rehabilitación infantil. */
  datosInfantiles: DatosInfantiles | null;
  camposFaltantes: string[];
  puedeIniciarValoracion: boolean;
  /** §13: con registros clínicos no se elimina; se archiva. */
  tieneRegistrosClinicos: boolean;
  /** v1.4 §8.7: centro médico de atención (modalidad CENTRO). */
  centro: CentroPublico | null;
  otrasHistorias: HistoriaDelPaciente[];
}

export function aHistoriaResumen(h: HistoriaConRepresentante): HistoriaResumen {
  return {
    idHistoria: h.idHistoria,
    tipo: h.tipo,
    estado: h.estado,
    archivada: h.archivada,
    nombre: h.nombre,
    apellido: h.apellido,
    nacionalidad: h.nacionalidad,
    cedula: h.cedula,
    sinDocumento: h.sinDocumento,
    telefono: h.telefono,
    fechaNacimiento: deFechaBd(h.fechaNacimiento),
    fechaCreacion: h.fechaCreacion.toISOString(),
    fechaActualizacion: h.fechaActualizacion.toISOString(),
    fechaArchivo: h.fechaArchivo?.toISOString() ?? null,
  };
}

export function aDatosPersonales(h: HistoriaConRepresentante): DatosPersonales {
  return {
    nombre: h.nombre,
    apellido: h.apellido,
    nacionalidad: h.nacionalidad,
    cedula: h.cedula,
    sinDocumento: h.sinDocumento,
    fechaNacimiento: deFechaBd(h.fechaNacimiento),
    sexo: h.sexo,
    dominancia: h.dominancia,
    ocupacion: h.ocupacion,
    nivelEducativo: h.nivelEducativo,
    estadoCivil: h.estadoCivil,
    lugarNacimiento: h.lugarNacimiento,
    telefono: h.telefono,
    correo: h.correo,
    dirEstado: h.dirEstado,
    dirMunicipio: h.dirMunicipio,
    dirParroquia: h.dirParroquia,
    dirComunidad: h.dirComunidad,
    contactoNombre: h.contactoNombre,
    contactoParentesco: h.contactoParentesco,
    contactoTelefono: h.contactoTelefono,
    demandasFisicas: h.demandasFisicas,
    fuenteInformacion: h.fuenteInformacion,
    modalidad: h.modalidad,
    idCentro: h.idCentro,
  };
}

function aDatosRepresentante(h: HistoriaConRepresentante): DatosRepresentante | null {
  const r = h.representante;
  if (!r) return null;
  return {
    parentesco: r.parentesco,
    nombre: r.nombre,
    apellido: r.apellido,
    cedula: r.cedula,
    edad: r.edad,
    estadoCivil: r.estadoCivil,
    gradoInstruccion: r.gradoInstruccion,
    ocupacion: r.ocupacion,
  };
}

function aDatosInfantiles(h: HistoriaConRepresentante): DatosInfantiles | null {
  const d = h.datosInfantiles;
  if (!d) return null;
  return Object.fromEntries(
    CAMPOS_INFANTILES.map((campo) => [campo, d[campo]]),
  ) as unknown as DatosInfantiles;
}

export function aHistoriaDetalle(
  h: HistoriaConRepresentante,
  otrasHistorias: HistoriaDelPaciente[],
  tieneRegistrosClinicos = false,
  centro: CentroPublico | null = null,
): HistoriaDetalle {
  const datos = aDatosPersonales(h);
  const representante = aDatosRepresentante(h);
  const datosInfantiles = aDatosInfantiles(h);
  const camposFaltantes = calcularCamposFaltantes(h.tipo, datos, representante, datosInfantiles);
  return {
    ...aHistoriaResumen(h),
    datos,
    representante,
    datosInfantiles,
    camposFaltantes,
    puedeIniciarValoracion: puedeIniciarValoracion(h.estado, h.archivada, camposFaltantes),
    tieneRegistrosClinicos,
    centro,
    otrasHistorias,
  };
}
