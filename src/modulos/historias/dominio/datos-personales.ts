import type {
  NacionalidadPaciente,
  ParentescoRepresentante,
  SexoPaciente,
} from '../../../generado/prisma/enums.js';

/** Datos personales de una historia, ya normalizados (vacío = null). Fechas ISO `AAAA-MM-DD`. */
export interface DatosPersonales {
  nombre: string;
  apellido: string;
  nacionalidad: NacionalidadPaciente | null;
  cedula: string | null;
  sinDocumento: boolean;
  fechaNacimiento: string | null;
  sexo: SexoPaciente | null;
  dominancia: string | null;
  ocupacion: string | null;
  nivelEducativo: string | null;
  estadoCivil: string | null;
  lugarNacimiento: string | null;
  telefono: string | null;
  correo: string | null;
  dirEstado: string | null;
  dirMunicipio: string | null;
  dirParroquia: string | null;
  dirComunidad: string | null;
  contactoNombre: string | null;
  contactoParentesco: string | null;
  contactoTelefono: string | null;
  demandasFisicas: string | null;
  fuenteInformacion: string[];
}

/** SPEC §8.4: representante único (madre o padre) de una historia infantil. */
export interface DatosRepresentante {
  parentesco: ParentescoRepresentante | null;
  nombre: string | null;
  apellido: string | null;
  cedula: string | null;
  fechaNacimiento: string | null;
  estadoCivil: string | null;
  gradoInstruccion: string | null;
  ocupacion: string | null;
}

export const CAMPOS_REPRESENTANTE = [
  'parentesco',
  'nombre',
  'apellido',
  'cedula',
  'fechaNacimiento',
  'estadoCivil',
  'gradoInstruccion',
  'ocupacion',
] as const satisfies readonly (keyof DatosRepresentante)[];

/** Cadena recortada, o null si queda vacía. */
export function textoONulo(valor: string | null | undefined): string | null {
  const recortado = valor?.trim();
  return recortado ? recortado : null;
}

/** La cédula se guarda solo con dígitos (admite que se escriba con puntos: "15.482.301"). */
export function normalizarCedula(valor: string | null | undefined): string | null {
  const digitos = valor?.replace(/\D/g, '');
  return digitos ? digitos : null;
}
