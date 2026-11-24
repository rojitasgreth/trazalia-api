// Definición declarativa de las fichas de valoración (SPEC Módulo C §8, ADR-0005).
// Los constructores imitan los del prototipo "Trazalia — Prototipo" (página
// Módulo C) para poder comparar la transcripción línea a línea. Las claves de
// cada campo se derivan de la sección y de la etiqueta; la prueba de fichas fija
// la lista completa, así que cambiar una etiqueta exige una versión nueva.

/** Dato personal de la historia que muestra un campo de solo lectura. */
export type FuenteDato =
  | 'nombre'
  | 'documento'
  | 'fechaNacimiento'
  | 'edad'
  | 'sexo'
  | 'dominancia'
  | 'ocupacion'
  | 'demandasFisicas'
  | 'telefono'
  | 'contacto'
  | 'nivelEducativo'
  | 'fuenteInformacion'
  | 'estadoCivil'
  | 'lugarNacimiento'
  | 'residencia'
  | 'nacionalidad'
  | 'contactoNombre'
  | 'contactoParentesco'
  | 'contactoTelefono';

/** Se asigna al iniciar la valoración y no se edita (RF-C03). */
export type Automatico = 'fisioterapeuta' | 'fechaHora' | 'fecha';

/**
 * Cómo se escribe un valor numérico. Los rangos solo frenan errores de tipeo,
 * no valores clínicos raros (decisión del 24-11-2026).
 */
export type Formato =
  | { k: 'entero'; min: number; max: number }
  | { k: 'decimal'; min: number; max: number }
  /** Sistólica/diastólica, como "120/80". */
  | { k: 'presion' };

const entero = (min: number, max: number): Formato => ({ k: 'entero', min, max });
const decimal = (min: number, max: number): Formato => ({ k: 'decimal', min, max });

/** El formato que implica la unidad que la ficha pone junto al campo. */
export function formatoDeUnidad(unidad: string | undefined): Formato | undefined {
  if (!unidad) return undefined;
  const fraccion = /^\/(\d+)$/.exec(unidad);
  if (fraccion) return entero(0, Number(fraccion[1]));
  return {
    '%': entero(0, 100),
    '°': entero(-180, 360),
    '°C': decimal(25, 45),
    lpm: entero(20, 300),
    rpm: entero(4, 80),
    mmHg: entero(20, 300),
    kg: decimal(0.3, 400),
    cm: decimal(20, 250),
    s: decimal(0, 3600),
    seg: decimal(0, 3600),
    m: decimal(0, 5000),
    'm/s': decimal(0, 10),
  }[unidad];
}

/** Filas de signos vitales cuya unidad va en el nombre de la fila ("FC lpm", "PA"). */
function formatoDeFila(etiqueta: string): Formato | undefined {
  if (/^PA\b/.test(etiqueta)) return { k: 'presion' };
  if (/^FC\b/.test(etiqueta)) return formatoDeUnidad('lpm');
  if (/^FR\b/.test(etiqueta)) return formatoDeUnidad('rpm');
  if (/^SpO₂/.test(etiqueta)) return formatoDeUnidad('%');
  if (/^Temp\b/.test(etiqueta)) return formatoDeUnidad('°C');
  return undefined;
}

export interface Parte {
  id: string;
  etiqueta: string;
  unidad?: string;
  tipo?: 'fecha' | 'hora';
  ancho?: number;
  formato?: Formato;
}

export type Campo =
  | {
      id: string;
      k: 'texto';
      etiqueta: string;
      placeholder?: string;
      completo?: boolean;
      predeterminado?: FuenteDato;
    }
  | { id: string; k: 'area'; etiqueta: string; placeholder?: string }
  | { id: string; k: 'numero'; etiqueta: string; unidad: string; formato?: Formato }
  | { id: string; k: 'fecha'; etiqueta: string }
  | { id: string; k: 'unica'; etiqueta: string; opciones: string[]; completo?: boolean }
  | { id: string; k: 'multiple'; etiqueta: string; opciones: string[]; otroLibre?: boolean }
  | { id: string; k: 'grupo'; etiqueta: string; partes: Parte[] }
  | { id: string; k: 'info'; etiqueta: string; fuente: FuenteDato }
  | { id: string; k: 'auto'; etiqueta: string; automatico: Automatico }
  | { id: string; k: 'imc'; etiqueta: string; ayuda: string; peso: string; talla: string };

export type Celda =
  | { k: 'fijo'; texto: string; destacado?: boolean }
  | { k: 'na' }
  | {
      k: 'texto';
      id: string;
      unidad?: string;
      placeholder?: string;
      tipo?: 'fecha';
      habilitadaPor?: string;
      formato?: Formato;
    }
  | { k: 'unica'; id: string; opciones: string[] }
  | { k: 'partes'; id: string; partes: Parte[]; habilitadaPor?: string }
  | { k: 'casilla'; id: string; etiqueta: string }
  | { k: 'bandera'; color: string; texto: string };

export interface Columna {
  titulo: string;
  ancho: string;
}

export interface FilaReferencia {
  celdas: string[];
  encabezado?: boolean;
  /** Leyenda de colores (objetivos por plazo y herramienta). */
  colores?: string[];
}

export type Bloque =
  | { k: 'nota'; texto: string }
  | { k: 'sub'; texto: string }
  | { k: 'campos'; campos: Campo[] }
  | { k: 'tabla'; id: string; titulo: string; columnas: Columna[]; filas: Celda[][] }
  | {
      k: 'referencia';
      titulo: string;
      /** `dolor`: barra de 11 valores de verde a rojo (SPEC C §7). */
      especial?: 'dolor';
      filas: FilaReferencia[];
      columnas?: string;
      pie?: string;
    };

export interface Seccion {
  id: string;
  titulo: string;
  corto: string;
  bloques: Bloque[];
}

export interface Firma {
  titulo: string;
  /** Quién firma: el fisioterapeuta de la valoración o el paciente/representante. */
  quien: 'fisioterapeuta' | 'paciente';
  indicacion: string;
}

export interface Ficha {
  tipo: 'TRAUMA_ADULTO' | 'NEURO_ADULTO' | 'REHAB_INFANTIL' | 'ADULTO_MAYOR';
  version: number;
  titulo: string;
  subtitulo: string;
  secciones: Seccion[];
  firmas: Firma[];
}

/** `"Dolor NRS 0–10"` → `"dolor_nrs_0_10"` (sin tildes ni símbolos). */
export function slug(texto: string): string {
  const limpio = texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/₂/g, '2')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return limpio || 'x';
}

// ─── Constructores (mismos nombres que el prototipo) ───────────────────────
// Devuelven "plantillas" sin id; `S` asigna los ids al armar la sección.

type SinId<T> = T extends { id: string } ? Omit<T, 'id'> : T;
type CampoPlantilla = SinId<Campo>;
type CeldaPlantilla =
  | string
  | { t: string; destacado?: boolean }
  | { i: 1; u?: string; ph?: string; tipo?: 'fecha'; habilitadaPor?: number; f?: Formato }
  | { r: string[] }
  | { m: { l: string; u?: string; calc?: boolean; f?: Formato }[]; habilitadaPor?: number }
  | { ck: 1; etiqueta: string }
  | { flag: string; t: string };

export const T = (
  etiqueta: string,
  o: { ph?: string; completo?: boolean; predeterminado?: FuenteDato } = {},
): CampoPlantilla => ({
  k: 'texto',
  etiqueta,
  ...(o.ph ? { placeholder: o.ph } : {}),
  ...(o.completo ? { completo: true } : {}),
  ...(o.predeterminado ? { predeterminado: o.predeterminado } : {}),
});
export const N = (etiqueta: string, unidad: string): CampoPlantilla => {
  const formato = formatoDeUnidad(unidad);
  return { k: 'numero', etiqueta, unidad, ...(formato ? { formato } : {}) };
};
export const D = (etiqueta: string): CampoPlantilla => ({ k: 'fecha', etiqueta });
export const A = (etiqueta: string, o: { ph?: string } = {}): CampoPlantilla => ({
  k: 'area',
  etiqueta,
  ...(o.ph ? { placeholder: o.ph } : {}),
});
export const R = (
  etiqueta: string,
  opciones: string[],
  o: { completo?: boolean } = {},
): CampoPlantilla => ({
  k: 'unica',
  etiqueta,
  opciones,
  ...(o.completo ? { completo: true } : {}),
});
export const K = (
  etiqueta: string,
  opciones: string[],
  o: { otroLibre?: boolean } = {},
): CampoPlantilla => ({
  k: 'multiple',
  etiqueta,
  opciones,
  ...(o.otroLibre ? { otroLibre: true } : {}),
});
export const G = (
  etiqueta: string,
  partes: { l: string; u?: string; tipo?: 'fecha' | 'hora'; w?: number; f?: Formato }[],
): CampoPlantilla => ({
  k: 'grupo',
  etiqueta,
  partes: partes.map((p) => {
    const formato = p.f ?? formatoDeUnidad(p.u);
    return {
      id: slug(p.l),
      etiqueta: p.l,
      ...(p.u ? { unidad: p.u } : {}),
      ...(p.tipo ? { tipo: p.tipo } : {}),
      ...(p.w ? { ancho: p.w } : {}),
      ...(formato ? { formato } : {}),
    };
  }),
});

/** Formatos explícitos para los campos cuya unidad no lo dice. */
export const FORMATOS = { entero, decimal };
export const I = (etiqueta: string, fuente: FuenteDato): CampoPlantilla => ({
  k: 'info',
  etiqueta,
  fuente,
});
export const AU = (etiqueta: string, automatico: Automatico): CampoPlantilla => ({
  k: 'auto',
  etiqueta,
  automatico,
});
/** IMC calculado con el peso y la talla de la misma sección (RF-C08). */
export const IMC = (
  etiqueta: string,
  ayuda: string,
  peso: string,
  talla: string,
): CampoPlantilla => ({
  k: 'imc',
  etiqueta,
  ayuda,
  peso,
  talla,
});

type BloquePlantilla =
  | { k: 'nota'; texto: string }
  | { k: 'sub'; texto: string }
  | { k: 'campos'; campos: CampoPlantilla[] }
  | { k: 'tabla'; titulo: string; columnas: Columna[]; filas: CeldaPlantilla[][] }
  | Extract<Bloque, { k: 'referencia' }>;

export const F = (...campos: CampoPlantilla[]): BloquePlantilla => ({ k: 'campos', campos });
export const SUB = (texto: string): BloquePlantilla => ({ k: 'sub', texto });
export const NOTE = (texto: string): BloquePlantilla => ({ k: 'nota', texto });
export const REF = (
  titulo: string,
  filas: FilaReferencia[],
  o: { pie?: string; columnas?: string; especial?: 'dolor' } = {},
): BloquePlantilla => ({ k: 'referencia', titulo, filas, ...o });
export const TB = (
  titulo: string,
  columnas: [string, string][],
  filas: CeldaPlantilla[][],
): BloquePlantilla => ({
  k: 'tabla',
  titulo,
  columnas: columnas.map(([t, w]) => ({ titulo: t, ancho: w })),
  filas,
});

export const IN: CeldaPlantilla = { i: 1 };
export const SN: CeldaPlantilla = { r: ['Sí', 'No'] };

/** Filas en blanco iguales (primer campo libre), como `blank()` del prototipo. */
export function blank(filas: number, celdas: CeldaPlantilla[]): CeldaPlantilla[][] {
  return Array.from({ length: filas }, () =>
    celdas.map((c) => (typeof c === 'object' ? { ...c } : c)),
  );
}

function unico(id: string, usados: Set<string>): string {
  let candidato = id;
  for (let n = 2; usados.has(candidato); n++) candidato = `${id}_${n}`;
  usados.add(candidato);
  return candidato;
}

function armarCelda(
  c: CeldaPlantilla,
  base: string,
  idsDeFila: string[],
  formatoFila: Formato | undefined,
): Celda {
  if (typeof c === 'string') return c === '—' ? { k: 'na' } : { k: 'fijo', texto: c };
  if ('t' in c && !('flag' in c))
    return { k: 'fijo', texto: c.t, ...(c.destacado ? { destacado: true } : {}) };
  if ('flag' in c) return { k: 'bandera', color: c.flag, texto: c.t };
  if ('ck' in c) return { k: 'casilla', id: base, etiqueta: c.etiqueta };
  if ('r' in c) return { k: 'unica', id: base, opciones: c.r };
  if ('m' in c) {
    return {
      k: 'partes',
      id: base,
      partes: c.m.map((p, n) => {
        const formato = p.f ?? formatoDeUnidad(p.u);
        return {
          id: p.calc ? 'imc' : `p${n + 1}`,
          etiqueta: p.l,
          ...(p.u ? { unidad: p.u } : {}),
          ...(formato ? { formato } : {}),
        };
      }),
      ...(c.habilitadaPor !== undefined ? { habilitadaPor: idsDeFila[c.habilitadaPor]! } : {}),
    };
  }
  const formato = c.tipo ? undefined : (c.f ?? formatoDeUnidad(c.u) ?? formatoFila);
  return {
    k: 'texto',
    id: base,
    ...(c.u ? { unidad: c.u } : {}),
    ...(c.ph ? { placeholder: c.ph } : {}),
    ...(c.tipo ? { tipo: c.tipo } : {}),
    ...(c.habilitadaPor !== undefined ? { habilitadaPor: idsDeFila[c.habilitadaPor]! } : {}),
    ...(formato ? { formato } : {}),
  };
}

/** Arma una sección asignando ids estables: `s<n>.<etiqueta>` y `s<n>.<tabla>.f<fila>.c<columna>`. */
export function S(
  numero: number,
  titulo: string,
  bloques: BloquePlantilla[],
  corto: string,
): Seccion {
  const sid = `s${numero}`;
  const usados = new Set<string>();
  return {
    id: sid,
    titulo,
    corto,
    bloques: bloques.map((b): Bloque => {
      if (b.k === 'campos') {
        return {
          k: 'campos',
          campos: b.campos.map(
            (c) => ({ ...c, id: unico(`${sid}.${slug(c.etiqueta)}`, usados) }) as Campo,
          ),
        };
      }
      if (b.k === 'tabla') {
        const id = unico(`${sid}.${slug(b.titulo)}`, usados);
        return {
          k: 'tabla',
          id,
          titulo: b.titulo,
          columnas: b.columnas,
          filas: b.filas.map((fila, f) => {
            const ids = fila.map((_, c) => `${id}.f${f + 1}.c${c + 1}`);
            const formatoFila = typeof fila[0] === 'string' ? formatoDeFila(fila[0]) : undefined;
            return fila.map((celda, c) => armarCelda(celda, ids[c]!, ids, formatoFila));
          }),
        };
      }
      return b;
    }),
  };
}
