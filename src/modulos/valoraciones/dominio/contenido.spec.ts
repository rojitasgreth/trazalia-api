import { formatoDeUnidad } from '../fichas/dsl.js';
import { fichaDe } from '../fichas/index.js';
import { contenidoInicial, validarContenido } from './contenido.js';
import type { DatosDeLaFicha } from './datos-de-la-ficha.js';

const trauma = fichaDe('TRAUMA_ADULTO');
const neuro = fichaDe('NEURO_ADULTO');

describe('validarContenido (SPEC C §7, ADR-0005)', () => {
  it('RF-C07: un contenido vacío es válido', () => {
    expect(validarContenido(trauma, {})).toEqual({ contenido: {}, errores: [] });
  });

  it('recorta textos y descarta vacíos, casillas sin marcar y listas vacías', () => {
    const { contenido, errores } = validarContenido(trauma, {
      's1.medico_tratante': '  Dr. Mendoza ',
      's1.centro_servicio': '   ',
      's2.mecanismo': [],
      's2.fase': 'Subaguda',
      's2.mecanismo_2': undefined,
    });
    expect(errores).toEqual([
      { clave: 's2.mecanismo_2', mensaje: 'El campo no existe en esta ficha.' },
    ]);
    expect(contenido).toEqual({ 's1.medico_tratante': 'Dr. Mendoza', 's2.fase': 'Subaguda' });
  });

  it('valida opciones, listas, fechas, números y tablas de filas fijas', () => {
    const { errores } = validarContenido(trauma, {
      's2.fase': 'Otra',
      's2.mecanismo': ['Torsión', 'Volando'],
      's2.fecha_lesion_cirugia': '24/08/2026',
      's5.signos_vitales_y_antropometria.f6.c2.imc': 'alto',
      's4.cribado_de_seguridad_banderas_rojas.f12.c2': 'Sí',
    });
    expect(errores.map((e) => e.clave)).toEqual([
      's2.fase',
      's2.mecanismo',
      's2.fecha_lesion_cirugia',
      's5.signos_vitales_y_antropometria.f6.c2.imc',
      's4.cribado_de_seguridad_banderas_rojas.f12.c2',
    ]);
  });

  it.each(['TRAUMA_ADULTO', 'NEURO_ADULTO', 'REHAB_INFANTIL', 'ADULTO_MAYOR'] as const)(
    '%s: los textos largos admiten hasta 1000 caracteres',
    (tipo) => {
      const ficha = fichaDe(tipo);
      const areas = ficha.secciones
        .flatMap((s) => s.bloques)
        .flatMap((b) => (b.k === 'campos' ? b.campos : []))
        .filter((c) => c.k === 'area');
      expect(areas.length).toBeGreaterThan(0);
      for (const { id } of areas) {
        expect(validarContenido(ficha, { [id]: 'a'.repeat(1000) }).errores).toEqual([]);
        expect(validarContenido(ficha, { [id]: 'a'.repeat(1001) }).errores).toEqual([
          { clave: id, mensaje: 'Máximo 1000 caracteres.' },
        ]);
      }
    },
  );

  it('los campos numéricos aceptan decimales sin cero inicial y rechazan las unidades', () => {
    for (const valor of ['1', '0,8', '.5', ',5']) {
      expect(validarContenido(neuro, { 's11.10mwt': valor }).errores).toEqual([]);
    }
    for (const valor of ['85/100', '1,2 m/s', 'No aplica', '.']) {
      expect(validarContenido(neuro, { 's11.10mwt': valor }).errores).toEqual([
        { clave: 's11.10mwt', mensaje: 'Debe ser un número.' },
      ]);
    }
  });

  it('decisión del 24-11-2026: la unidad fija el formato y el rango del valor', () => {
    const error = (ficha: typeof trauma, clave: string, valor: string) =>
      validarContenido(ficha, { [clave]: valor }).errores[0]?.mensaje ?? null;

    // "/100" y "/10": enteros de 0 al máximo, también en grupos y celdas.
    expect(error(neuro, 's13.barthel', '85')).toBeNull();
    expect(error(neuro, 's13.barthel', '85,5')).toBe('Debe ser un número entero.');
    expect(error(neuro, 's13.barthel', '101')).toBe('Debe estar entre 0 y 100.');
    expect(error(trauma, 's3.dolor_nrs_0_10.actual', '10')).toBeNull();
    expect(error(trauma, 's3.dolor_nrs_0_10.actual', '11')).toBe('Debe estar entre 0 y 10.');
    // Filas de signos vitales: la unidad va en el nombre de la fila.
    const vitales = 's5.signos_vitales_y_antropometria';
    expect(error(trauma, `${vitales}.f1.c2`, '120/80')).toBeNull();
    expect(error(trauma, `${vitales}.f1.c2`, '12080')).toBe('Escribe la presión como 120/80.');
    expect(error(trauma, `${vitales}.f2.c2`, '400')).toBe('Debe estar entre 20 y 300.');
    expect(error(trauma, `${vitales}.f5.c2`, '36,5')).toBeNull();
    expect(error(trauma, `${vitales}.f6.c2.p1`, '78,5')).toBeNull();
    expect(error(trauma, `${vitales}.f6.c2.p1`, '0,1')).toBe('Debe estar entre 0,3 y 400.');
  });

  it.each(['TRAUMA_ADULTO', 'NEURO_ADULTO', 'REHAB_INFANTIL', 'ADULTO_MAYOR'] as const)(
    '%s: todo campo con una unidad conocida tiene formato',
    (tipo) => {
      const ficha = fichaDe(tipo);
      const sinFormato: string[] = [];
      for (const bloque of ficha.secciones.flatMap((s) => s.bloques)) {
        if (bloque.k === 'campos') {
          for (const c of bloque.campos) {
            if (c.k === 'numero' && formatoDeUnidad(c.unidad) && !c.formato) sinFormato.push(c.id);
            if (c.k === 'grupo') {
              for (const p of c.partes) {
                if (formatoDeUnidad(p.unidad) && !p.formato) sinFormato.push(`${c.id}.${p.id}`);
              }
            }
          }
        }
        if (bloque.k === 'tabla') {
          for (const celda of bloque.filas.flat()) {
            if (celda.k === 'texto' && formatoDeUnidad(celda.unidad) && !celda.formato) {
              sinFormato.push(celda.id);
            }
          }
        }
      }
      expect(sinFormato).toEqual([]);
    },
  );

  it('acepta los valores de la ficha, incluido el IMC con coma decimal y el texto libre de Inspección', () => {
    const { contenido, errores } = validarContenido(trauma, {
      's2.mecanismo': ['Torsión', 'Deportivo', 'Torsión'],
      's3.dolor_nrs_0_10.actual': '3',
      's5.signos_vitales_y_antropometria.f6.c2.imc': '25,2',
      's6.6_1_inspeccion.otro': 'Cojera',
      's6.palpacion_y_tejidos.f1.c4': '++',
    });
    expect(errores).toEqual([]);
    expect(contenido['s2.mecanismo']).toEqual(['Torsión', 'Deportivo']);
  });

  it('RF-C10: descarta el puntaje de una escala no aplicada', () => {
    const banco = 's14.banco_amplio_de_escalas';
    const { contenido } = validarContenido(neuro, {
      [`${banco}.f4.c1`]: true,
      [`${banco}.f4.c5`]: '48',
      [`${banco}.f5.c5`]: '20',
      [`${banco}.f24.c5.p1`]: 'C5',
    });
    expect(contenido).toEqual({ [`${banco}.f4.c1`]: true, [`${banco}.f4.c5`]: '48' });
  });

  it('rechaza un tipo de dato equivocado', () => {
    const { errores } = validarContenido(neuro, {
      's14.banco_amplio_de_escalas.f1.c1': 'sí',
      's2.antecedentes': 'ACV',
      's1.neurologo_medico': 3,
    });
    expect(errores).toHaveLength(3);
  });

  it('precarga los nombres que la ficha toma de la historia', () => {
    const datos = { nombre: 'Carlos Andrade', documento: 'V-15.482.301' } as DatosDeLaFicha;
    expect(contenidoInicial(trauma, datos)).toEqual({
      's11.paciente_representante_nombre': 'Carlos Andrade',
    });
    expect(contenidoInicial(fichaDe('ADULTO_MAYOR'), datos)).toEqual({
      's12.yo_nombre': 'Carlos Andrade',
      's12.c_i': 'V-15.482.301',
    });
  });
});
