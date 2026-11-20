import type { TipoHistoria } from '../../../generado/prisma/enums.js';
import { esquemaDe } from '../dominio/contenido.js';
import type { Bloque, Ficha } from './dsl.js';
import { fichaDe, VERSION_ACTUAL } from './index.js';

const TIPOS: TipoHistoria[] = ['TRAUMA_ADULTO', 'NEURO_ADULTO', 'REHAB_INFANTIL', 'ADULTO_MAYOR'];

function tablas(ficha: Ficha) {
  return ficha.secciones.flatMap((s) =>
    s.bloques.filter((b): b is Extract<Bloque, { k: 'tabla' }> => b.k === 'tabla'),
  );
}

function filasDe(ficha: Ficha, titulo: string): number {
  const tabla = tablas(ficha).find((t) => t.titulo === titulo);
  if (!tabla) throw new Error(`Sin tabla ${titulo}`);
  return tabla.filas.length;
}

function etiquetas(ficha: Ficha): string[] {
  return ficha.secciones.flatMap((s) =>
    s.bloques.flatMap((b) => (b.k === 'campos' ? b.campos.map((c) => c.etiqueta) : [])),
  );
}

describe('Fichas de valoración (SPEC C §8)', () => {
  it('AC-C03: Traumatología tiene las secciones 1 a 10 y el consentimiento, en orden', () => {
    const ficha = fichaDe('TRAUMA_ADULTO');
    expect(ficha.secciones.map((s) => s.titulo.split(' ')[0])).toEqual([
      '1.',
      '2.',
      '3.',
      '4.',
      '5.',
      '6.',
      '7.',
      '8.',
      '9.',
      '10.',
      'Consentimiento',
    ]);
  });

  it('Neurología tiene las secciones 1 a 18 y el consentimiento', () => {
    const ficha = fichaDe('NEURO_ADULTO');
    expect(ficha.secciones).toHaveLength(19);
    expect(ficha.secciones.at(-1)?.titulo).toBe('Consentimiento y firmas');
  });

  it('Infantil va de Datos de la valoración a Intervención y no tiene firmas (§11)', () => {
    const ficha = fichaDe('REHAB_INFANTIL');
    expect(ficha.secciones).toHaveLength(12);
    expect(ficha.secciones[0]?.titulo).toBe('Datos de la valoración');
    expect(ficha.secciones.at(-1)?.titulo).toBe('Intervención');
    expect(ficha.firmas).toEqual([]);
  });

  it('Adulto mayor registra "Alérgicos" una sola vez (§7)', () => {
    const ficha = fichaDe('ADULTO_MAYOR');
    expect(ficha.secciones).toHaveLength(12);
    expect(etiquetas(ficha).filter((e) => e === 'Alérgicos')).toHaveLength(1);
  });

  it('RF-C09/AC-C10: las tablas tienen exactamente las filas de la ficha', () => {
    const trauma = fichaDe('TRAUMA_ADULTO');
    expect(filasDe(trauma, 'Cribado de seguridad / banderas rojas')).toBe(11);
    expect(filasDe(trauma, 'Signos vitales y antropometría')).toBe(6);
    expect(filasDe(trauma, 'Palpación y tejidos')).toBe(3);
    expect(filasDe(trauma, 'Rango de movimiento')).toBe(4);
    expect(filasDe(trauma, 'Fuerza y control motor')).toBe(4);
    expect(filasDe(trauma, 'Examen neurovascular periférico')).toBe(6);
    expect(filasDe(trauma, 'Pruebas especiales')).toBe(3);
    expect(filasDe(trauma, 'Función y participación – ICF')).toBe(7);
    expect(filasDe(trauma, 'Medidas de resultado')).toBe(9);

    const neuro = fichaDe('NEURO_ADULTO');
    expect(filasDe(neuro, 'Banco amplio de escalas')).toBe(43);
    expect(filasDe(neuro, 'Registro de escalas aplicadas')).toBe(5);
    expect(filasDe(neuro, 'Pares craneales')).toBe(8);

    const infantil = fichaDe('REHAB_INFANTIL');
    expect(filasDe(infantil, 'Función motora por miotoma')).toBe(10);
    expect(filasDe(infantil, 'Sistema de banderas')).toBe(5);
    expect(filasDe(infantil, 'Reflejos osteotendinosos')).toBe(3);
  });

  it('RF-C10: el puntaje de cada escala del banco depende de su casilla "Aplicada"', () => {
    const { dependencias } = esquemaDe(fichaDe('NEURO_ADULTO'));
    expect(dependencias.size).toBe(43 + 2); // dos escalas tienen dos partes (NLI|AIS y R1|R2)
    for (const casilla of dependencias.values()) expect(casilla).toMatch(/\.c1$/);
  });

  it('RF-C11: la ficha infantil incluye las seis escalas de referencia', () => {
    const referencias = fichaDe('REHAB_INFANTIL').secciones.flatMap((s) =>
      s.bloques
        .filter((b) => b.k === 'referencia')
        .map((b) => (b.k === 'referencia' ? b.titulo : '')),
    );
    expect(referencias).toEqual([
      'dolor 0–10 (caritas)',
      'FLACC (de 1 mes a 3 años y en pacientes no colaboradores)',
      'Ashworth modificada',
      'Campbell – clasificación de la hipotonía',
      'Medical Research Council (MRC)',
      'leyenda de objetivos por plazo y herramienta',
    ]);
  });

  it.each(TIPOS)(
    '%s: las claves son únicas y no cambian sin una versión nueva (ADR-0005)',
    (tipo) => {
      const ficha = fichaDe(tipo);
      expect(ficha.version).toBe(VERSION_ACTUAL[tipo]);
      const claves = [...esquemaDe(ficha).reglas.keys()];
      expect(new Set(claves).size).toBe(claves.length);
      expect(claves).toMatchSnapshot();
    },
  );

  it('rechaza una versión de ficha inexistente', () => {
    expect(() => fichaDe('TRAUMA_ADULTO', 99)).toThrow('No existe la ficha');
  });
});
