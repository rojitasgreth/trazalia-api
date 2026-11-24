import type { Ficha, Formato, FuenteDato } from '../fichas/dsl.js';

// SPEC C §7 y ADR-0005: el contenido es un mapa plano clave → valor. Ningún
// campo es obligatorio (RF-C07); lo que se valida es la forma: claves de la
// ficha, opciones válidas, filas fijas (RF-C09) y longitudes máximas.

export type ValorContenido = string | string[] | boolean;
export type Contenido = Record<string, ValorContenido>;

type Regla =
  | { k: 'texto'; max: number }
  | { k: 'numero'; formato?: Formato }
  | { k: 'fecha' }
  | { k: 'hora' }
  | { k: 'unica'; opciones: string[] }
  | { k: 'multiple'; opciones: string[] }
  | { k: 'casilla' };

interface Esquema {
  reglas: Map<string, Regla>;
  /** RF-C10: clave dependiente → casilla que la habilita. */
  dependencias: Map<string, string>;
  predeterminados: Map<string, FuenteDato>;
}

const CORTO = 500;
const LARGO = 1000;
const NUMERO = /^-?(\d+([.,]\d+)?|[.,]\d+)$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const PRESION = /^\d{2,3}\/\d{2,3}$/;

const cache = new WeakMap<Ficha, Esquema>();

function numero(formato: Formato | undefined): Regla {
  return formato ? { k: 'numero', formato } : { k: 'numero' };
}

function conComa(n: number): string {
  return String(n).replace('.', ',');
}

/**
 * Comprueba un valor numérico contra su formato; la web aplica la misma regla
 * antes de enviar (trazalia-web, ficha-formulario.ts).
 */
export function errorDeFormato(texto: string, formato: Formato | undefined): string | null {
  if (formato?.k === 'presion') {
    return PRESION.test(texto) ? null : 'Escribe la presión como 120/80.';
  }
  if (!NUMERO.test(texto) || texto.length > 20) return 'Debe ser un número.';
  if (!formato) return null;
  if (formato.k === 'entero' && !/^-?\d+$/.test(texto)) return 'Debe ser un número entero.';
  const valor = Number(texto.replace(',', '.'));
  return valor < formato.min || valor > formato.max
    ? `Debe estar entre ${conComa(formato.min)} y ${conComa(formato.max)}.`
    : null;
}

/** Reglas por clave, derivadas de la definición de la ficha. */
export function esquemaDe(ficha: Ficha): Esquema {
  const enCache = cache.get(ficha);
  if (enCache) return enCache;
  const reglas = new Map<string, Regla>();
  const dependencias = new Map<string, string>();
  const predeterminados = new Map<string, FuenteDato>();

  for (const seccion of ficha.secciones) {
    for (const bloque of seccion.bloques) {
      if (bloque.k === 'campos') {
        for (const c of bloque.campos) {
          switch (c.k) {
            case 'texto':
              reglas.set(c.id, { k: 'texto', max: CORTO });
              if (c.predeterminado) predeterminados.set(c.id, c.predeterminado);
              break;
            case 'area':
              reglas.set(c.id, { k: 'texto', max: LARGO });
              break;
            case 'numero':
              reglas.set(c.id, numero(c.formato));
              break;
            case 'imc':
              reglas.set(c.id, { k: 'numero' });
              break;
            case 'fecha':
              reglas.set(c.id, { k: 'fecha' });
              break;
            case 'unica':
              reglas.set(c.id, { k: 'unica', opciones: c.opciones });
              break;
            case 'multiple':
              reglas.set(c.id, { k: 'multiple', opciones: c.opciones });
              if (c.otroLibre) reglas.set(`${c.id}.otro`, { k: 'texto', max: CORTO });
              break;
            case 'grupo':
              for (const p of c.partes) {
                reglas.set(
                  `${c.id}.${p.id}`,
                  p.tipo === 'fecha'
                    ? { k: 'fecha' }
                    : p.tipo === 'hora'
                      ? { k: 'hora' }
                      : p.formato
                        ? numero(p.formato)
                        : { k: 'texto', max: CORTO },
                );
              }
              break;
            // info y auto no se editan: salen de la historia y de la valoración.
          }
        }
      }
      if (bloque.k === 'tabla') {
        for (const fila of bloque.filas) {
          for (const celda of fila) {
            switch (celda.k) {
              case 'texto':
                reglas.set(
                  celda.id,
                  celda.tipo === 'fecha'
                    ? { k: 'fecha' }
                    : celda.formato
                      ? numero(celda.formato)
                      : { k: 'texto', max: CORTO },
                );
                if (celda.habilitadaPor) dependencias.set(celda.id, celda.habilitadaPor);
                break;
              case 'unica':
                reglas.set(celda.id, { k: 'unica', opciones: celda.opciones });
                break;
              case 'casilla':
                reglas.set(celda.id, { k: 'casilla' });
                break;
              case 'partes':
                for (const p of celda.partes) {
                  const clave = `${celda.id}.${p.id}`;
                  reglas.set(
                    clave,
                    p.id === 'imc' || p.formato ? numero(p.formato) : { k: 'texto', max: CORTO },
                  );
                  if (celda.habilitadaPor) dependencias.set(clave, celda.habilitadaPor);
                }
                break;
            }
          }
        }
      }
    }
  }
  const esquema = { reglas, dependencias, predeterminados };
  cache.set(ficha, esquema);
  return esquema;
}

export interface ErrorContenido {
  clave: string;
  mensaje: string;
}

function validarValor(regla: Regla, valor: unknown): string | null {
  switch (regla.k) {
    case 'casilla':
      return typeof valor === 'boolean' ? null : 'Debe ser verdadero o falso.';
    case 'multiple':
      if (!Array.isArray(valor) || valor.some((v) => typeof v !== 'string'))
        return 'Debe ser una lista.';
      return valor.every((v) => regla.opciones.includes(v as string)) ? null : 'Opción no válida.';
    default:
      if (typeof valor !== 'string') return 'Debe ser texto.';
  }
  const texto = valor;
  switch (regla.k) {
    case 'texto':
      return texto.length <= regla.max ? null : `Máximo ${regla.max} caracteres.`;
    case 'numero':
      return errorDeFormato(texto, regla.formato);
    case 'fecha':
      return FECHA.test(texto) ? null : 'Fecha no válida.';
    case 'hora':
      return HORA.test(texto) ? null : 'Hora no válida.';
    case 'unica':
      return regla.opciones.includes(texto) ? null : 'Opción no válida.';
  }
}

/**
 * Normaliza y valida el contenido contra la ficha: recorta textos, descarta
 * vacíos (texto vacío, lista vacía, casilla sin marcar) y el puntaje de las
 * escalas no aplicadas (RF-C10). Las claves desconocidas son un error.
 */
export function validarContenido(
  ficha: Ficha,
  entrada: Record<string, unknown>,
): { contenido: Contenido; errores: ErrorContenido[] } {
  const { reglas, dependencias } = esquemaDe(ficha);
  const contenido: Contenido = {};
  const errores: ErrorContenido[] = [];

  for (const [clave, crudo] of Object.entries(entrada)) {
    const regla = reglas.get(clave);
    if (!regla) {
      errores.push({ clave, mensaje: 'El campo no existe en esta ficha.' });
      continue;
    }
    if (crudo === null || crudo === undefined) continue;
    const valor = typeof crudo === 'string' ? crudo.trim() : crudo;
    if (valor === '' || valor === false || (Array.isArray(valor) && valor.length === 0)) continue;
    const error = validarValor(regla, valor);
    if (error) errores.push({ clave, mensaje: error });
    else
      contenido[clave] = Array.isArray(valor)
        ? [...new Set(valor as string[])]
        : (valor as ValorContenido);
  }

  for (const [clave, casilla] of dependencias) {
    if (contenido[casilla] !== true) delete contenido[clave];
  }
  return { contenido, errores };
}

/** Al iniciar: los campos que la ficha precarga con un dato de la historia (editables). */
export function contenidoInicial(ficha: Ficha, datos: Record<FuenteDato, string>): Contenido {
  const contenido: Contenido = {};
  for (const [clave, fuente] of esquemaDe(ficha).predeterminados) {
    if (datos[fuente]) contenido[clave] = datos[fuente];
  }
  return contenido;
}
