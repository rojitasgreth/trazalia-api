import { A, AU, blank, F, G, I, IN, K, NOTE, REF, S, SN, SUB, T, TB, type Ficha } from './dsl.js';

// SPEC C §8.3 — ficha-niños.pdf, desde Antecedentes prenatales, perinatales y
// postnatales hasta Intervención. Las tablas de ayuda son referencias
// consultables que no guardan datos (SPEC C §7). Transcrito del prototipo.

const ETIQUETAS_DOLOR = [
  'Sin dolor',
  '',
  'Dolor leve',
  '',
  'Dolor moderado',
  '',
  'Dolor severo',
  '',
  'Dolor muy severo',
  '',
  'Máximo dolor',
];

const REF_DOLOR = REF(
  'dolor 0–10 (caritas)',
  [{ celdas: Array.from({ length: 11 }, (_, n) => String(n)) }, { celdas: ETIQUETAS_DOLOR }],
  {
    especial: 'dolor',
    pie: 'En la ficha cada valor se acompaña de una carita, de la sonrisa (0) al llanto (10).',
  },
);

const REF_FLACC = REF(
  'FLACC (de 1 mes a 3 años y en pacientes no colaboradores)',
  [
    { celdas: ['', '0', '1', '2'], encabezado: true },
    { celdas: ['Cara', 'Cara relajada, expresión neutra', 'Arruga la nariz', 'Mandíbula tensa'] },
    { celdas: ['Piernas', 'Relajadas', 'Inquietas', 'Golpea con los pies'] },
    {
      celdas: [
        'Actividad',
        'Acostado y quieto',
        'Se dobla sobre el abdomen encogiendo las piernas',
        'Rígido',
      ],
    },
    { celdas: ['Llanto', 'No llora', 'Se queja, gime', 'Llanto fuerte'] },
    {
      celdas: [
        'Capacidad de consuelo',
        'Satisfecho',
        'Puede distraerse',
        'Dificultad para consolarlo',
      ],
    },
  ],
  {
    columnas: '120px 1fr 1fr 1fr',
    pie: 'Calificación del dolor de 0 al 10 (0 = no dolor; 10 = máximo dolor imaginable). 0: no dolor; 1–2: leve; 3–5: moderado; 6–8: intenso; 9–10: máximo dolor imaginable.',
  },
);

const REF_ASHWORTH = REF(
  'Ashworth modificada',
  [
    { celdas: ['Grado', 'Descripción'], encabezado: true },
    { celdas: ['0', 'Sin aumento en el tono muscular.'] },
    {
      celdas: [
        '1',
        'Aumento leve, resistencia mínima al final del rango de movimiento en flexión o extensión.',
      ],
    },
    {
      celdas: [
        '1+',
        'Aumento leve del tono, resistencia mínima durante el resto del rango de movimiento (menos de la mitad).',
      ],
    },
    {
      celdas: [
        '2',
        'Aumento más pronunciado a través de todo el rango de movimiento; la parte afectada se mueve con facilidad.',
      ],
    },
    { celdas: ['3', 'Aumento considerable del tono, el movimiento pasivo es difícil.'] },
    { celdas: ['4', 'La parte afectada está rígida en flexión o extensión.'] },
  ],
  { columnas: '70px 1fr' },
);

const REF_CAMPBELL = REF(
  'Campbell – clasificación de la hipotonía',
  [
    { celdas: ['Grado', 'Descripción'], encabezado: true },
    {
      celdas: [
        'Severa',
        'ACTIVO: Inhabilidad para resistir la gravedad. Falta de contracción de las articulaciones proximales para la estabilidad y aparente debilidad. PASIVO: Ninguna resistencia al movimiento impuesto por el examinador. Completo o excesivo rango de movimiento, hiperlaxitud.',
      ],
    },
    {
      celdas: [
        'Moderada',
        'ACTIVO: El tono muscular está disminuido principalmente en los músculos axiales y proximales. Interfiere con la cantidad de tiempo en la que mantiene una postura. PASIVO: Muy poca resistencia al movimiento impuesto por el examinador. Se encuentra menos resistencia en el movimiento alrededor de las articulaciones proximales. Hiperlaxitud en rodillas y tobillos en la toma de peso.',
      ],
    },
    {
      celdas: [
        'Leve',
        'ACTIVO: Interfiere con las contracciones de la musculatura axial. Retraso en el inicio del movimiento contragravedad. Reducida velocidad de ajuste a los cambios posturales. PASIVO: Arco de resistencia a los cambios articulares. Completo rango de movimiento pasivo. Hiperlaxitud limitada a manos, tobillos y pies.',
      ],
    },
    {
      celdas: [
        'Normal',
        'ACTIVO: Rápido e inmediato ajuste postural durante el movimiento. Habilidad para usar los músculos en patrones sinérgicos recíprocos para la estabilidad y la movilidad dependiendo de la tarea. PASIVO: Las partes del cuerpo se resisten al movimiento. Momentáneamente se mantiene una nueva postura cuando es colocada en el espacio. Puede rápidamente seguir cambios de movimiento impuestos por el examinador.',
      ],
    },
  ],
  { columnas: '100px 1fr' },
);

const REF_MRC = REF(
  'Medical Research Council (MRC)',
  [
    { celdas: ['Grado de fuerza', 'Definición'], encabezado: true },
    { celdas: ['5', 'Fuerza normal'] },
    { celdas: ['4', 'Movimiento activo contra gravedad y resistencia'] },
    { celdas: ['3', 'Movimiento activo contra gravedad, no contra resistencia'] },
    { celdas: ['2', 'Movimiento activo sin influencia de la gravedad'] },
    { celdas: ['1', 'Trazas de movimiento'] },
    { celdas: ['0', 'Ausencia de movimiento'] },
  ],
  { columnas: '120px 1fr' },
);

/** Leyenda de colores: verde, verde claro, rojo y negro, como en la ficha. */
const REF_OBJETIVOS = REF(
  'leyenda de objetivos por plazo y herramienta',
  [
    {
      celdas: ['', 'Ejercicio terapéutico', 'Terapia manual', 'Agentes físicos', 'Educación'],
      encabezado: true,
    },
    { celdas: ['Corto', '', '', '', ''], colores: ['', 'verde', 'verde', 'negro', 'negro'] },
    {
      celdas: ['Medio', '', '', '', ''],
      colores: ['', 'verde-claro', 'verde-claro', 'verde-claro', 'negro'],
    },
    { celdas: ['Largo plazo', '', '', '', ''], colores: ['', 'rojo', 'rojo', 'rojo', 'rojo'] },
  ],
  { columnas: '110px 1fr 1fr 1fr 1fr', pie: 'Leyenda de ayuda tal como aparece en la ficha.' },
);

const izquierdaDerecha = (titulo: string, centro: string, filas: string[]) =>
  TB(
    titulo,
    [
      ['Izquierda', '1fr'],
      [centro, '1.2fr'],
      ['Derecha', '1fr'],
    ],
    filas.map((h) => [IN, h, IN]),
  );

export const FICHA_INFANTIL_V1: Ficha = {
  tipo: 'REHAB_INFANTIL',
  version: 1,
  titulo: 'Historia fisioterapéutica – Rehabilitación infantil',
  subtitulo: 'Valoración del fisioterapeuta',
  secciones: [
    S(
      1,
      'Datos de la valoración',
      [
        NOTE(
          'Los datos personales, antecedentes maternos, datos al nacer y exámenes realizados se registran en los datos personales de la historia.',
        ),
        F(
          I('Paciente', 'nombre'),
          I('Documento', 'documento'),
          I('F.N.', 'fechaNacimiento'),
          I('Edad cronológica', 'edad'),
          I('Sexo', 'sexo'),
        ),
        F(AU('Fisioterapeuta', 'fisioterapeuta'), AU('Fecha', 'fecha')),
      ],
      'Datos de la valoración',
    ),
    S(
      2,
      'Antecedentes prenatales, perinatales y postnatales',
      [
        F(
          A('Antecedentes prenatales'),
          A('Antecedentes perinatales'),
          A('Antecedentes postnatales'),
        ),
      ],
      'Antecedentes pre, peri y postnatales',
    ),
    S(3, 'Anamnesis', [F(A('Anamnesis', { ph: 'Relato de la consulta' }))], 'Anamnesis'),
    S(
      4,
      'Valoración funcional del fisioterapeuta · Sistema musculoesquelético',
      [
        SUB('Dolor'),
        REF_DOLOR,
        REF_FLACC,
        SUB('Protocolo ALICIA'),
        F(
          T('Aparición'),
          T('Localización'),
          T('Irradiación'),
          T('Características'),
          T('Intensidad'),
          T('A- agravantes'),
          T('B- mitigantes'),
          T('Frecuencia'),
          T('Duración'),
          A('Observaciones'),
        ),
      ],
      'Sistema musculoesquelético',
    ),
    S(
      5,
      'Sistema muscular',
      [
        SUB('Pruebas musculares (fuerza escala Daniels-Lovett)'),
        izquierdaDerecha('Pruebas musculares, bloque 1', '', [
          'F',
          'E',
          'Abd',
          'Ad',
          'Rot-ext',
          'Rot-int',
        ]),
        izquierdaDerecha('Pruebas musculares, bloque 2', '', ['F', 'E']),
        izquierdaDerecha('Pruebas musculares, bloque 3', '', [
          'Dorsiflexión',
          'Flexión plantar',
          'Eversión',
          'Inversión',
        ]),
        SUB('Marcha'),
        F(T('Tipo', { completo: true })),
        TB(
          'Fase de apoyo',
          [
            ['Fase de apoyo · Estadio', '1.3fr'],
            ['Sí / No', '160px'],
            ['Observaciones', '1.2fr'],
          ],
          [
            'Contacto inicial',
            'Respuesta a la carga',
            'Apoyo medio (fase inicial)',
            'Apoyo medio',
            'Apoyo medio (fase final)',
          ].map((h) => [h, SN, IN]),
        ),
        TB(
          'Fase de balanceo',
          [
            ['Fase de balanceo · Estadio', '1.3fr'],
            ['Sí / No', '160px'],
            ['Observaciones', '1.2fr'],
          ],
          ['Pre-balanceo', 'Balanceo inicial', 'Balanceo medio', 'Balanceo final'].map((h) => [
            h,
            SN,
            IN,
          ]),
        ),
      ],
      'Sistema muscular y marcha',
    ),
    S(
      6,
      'Sistema neuromuscular',
      [
        SUB('Tono'),
        REF_ASHWORTH,
        REF_CAMPBELL,
        izquierdaDerecha('Tono por zona anatómica', 'Zona anatómica', ['Tronco', 'MMSS', 'MMII']),
        F(
          T('Observación', { completo: true }),
          T('Signo de bufanda'),
          T('Talón a oreja'),
          T('Signo de muñeco de trapo'),
        ),
        SUB('Función motora'),
        REF_MRC,
        izquierdaDerecha('Función motora por miotoma', 'Miotoma', [
          'C4',
          'C5',
          'C6',
          'C7',
          'C8',
          'T1',
          'L3',
          'L4',
          'L5',
          'S1',
        ]),
        SUB('Reflejos primitivos'),
        TB(
          'Reflejos primitivos',
          [
            ['Reflejo', '1fr'],
            ['Respuesta', '1.3fr'],
          ],
          blank(2, [IN, IN]),
        ),
        SUB('Reflejos osteotendinosos'),
        TB(
          'Reflejos osteotendinosos',
          [
            ['Respuesta refleja', '1.2fr'],
            ['Ausente 0 · Disminución - · Normal + · Aumentado ++', '2fr'],
          ],
          blank(3, [IN, { r: ['Ausente 0', 'Disminución -', 'Normal +', 'Aumentado ++'] }]),
        ),
      ],
      'Sistema neuromuscular',
    ),
    S(
      7,
      'Desarrollo psicomotor',
      [F(A('Motricidad gruesa'), A('Motricidad fina'), A('Social'), A('Lenguaje'), A('Cognitiva'))],
      'Desarrollo psicomotor',
    ),
    S(
      8,
      'Sistema cardiovascular-cardiorespiratorio',
      [
        TB(
          'Signos vitales',
          [
            ['SV', '120px'],
            ['Observación', '1fr'],
          ],
          ['FC', 'FR', 'SatO2', 'T', 'T.A'].map((h) => [h, IN]),
        ),
      ],
      'Cardiovascular-cardiorespiratorio',
    ),
    S(
      9,
      'Evaluación',
      [
        SUB('Cuadro de problemas'),
        F(
          A('Deficiencias: Directas/Primaria'),
          A('Deficiencias: Indirectas/Secundaria'),
          A('Deficiencias: Compuestas/Terciarias'),
          A('Factores contextuales: Actividades limitadas'),
          A('Factores contextuales: Participación restringida'),
          A('Observaciones'),
        ),
        SUB('Sistema de banderas (identificación y probabilidad de remisión)'),
        TB(
          'Sistema de banderas',
          [
            ['Sistema de banderas', '1.3fr'],
            ['Consideración 1 (porque se selecciona el color)', '1fr'],
            ['Consideración 2 (bases las cuales el color fue escogido)', '1fr'],
            ['Consideración 3 (observaciones especiales)', '1fr'],
            ['Resultado', '1fr'],
          ],
          [
            [{ flag: '#15201B', t: 'Obstáculos contextuales y del sistema' }, IN, IN, IN, IN],
            [
              {
                flag: '#E8C21B',
                t: 'Creencias personales · Respuestas emocionales · Comportamiento ante el dolor',
              },
              IN,
              IN,
              IN,
              IN,
            ],
            [{ flag: '#E8892B', t: 'Síntomas psiquiátricos' }, IN, IN, IN, IN],
            [{ flag: '#C21E1E', t: 'Patología grave o severa' }, IN, IN, IN, IN],
            [{ flag: '#2BA3D9', t: 'Relación con el trabajo y la salud' }, IN, IN, IN, IN],
          ],
        ),
        SUB('Pared de ladrillos Maitland permeable actual (enfermedad actual)'),
        TB(
          'Pared de ladrillos Maitland',
          [
            ['Teoría', '1fr'],
            ['Clínica', '1fr'],
          ],
          blank(2, [IN, IN]),
        ),
      ],
      'Evaluación',
    ),
    S(
      10,
      'Diagnóstico',
      [
        F(
          I('Paciente', 'nombre'),
          I('Edad', 'edad'),
          I('Sexo', 'sexo'),
          T('Diagnóstico médico'),
          T('CIE-10'),
          G('Fecha y hora', [
            { l: 'Fecha', tipo: 'fecha', w: 160 },
            { l: 'Hora', tipo: 'hora', w: 120 },
          ]),
        ),
        F(A('Percepción del paciente sobre los problemas de salud')),
        SUB(
          'Identificación de los problemas más relevantes desde la perspectiva del terapeuta según el examen físico-kinésico y aplicaciones de pruebas especiales',
        ),
        F(
          A('Funciones corporales'),
          A('Estructuras corporales'),
          A('Actividades'),
          A('Participación'),
        ),
        SUB('Observación del terapeuta'),
        F(
          A('Factores personales'),
          T('Factores ambientales: Vivienda'),
          T('Medio de transporte'),
          T('Trabajo'),
        ),
        F(A('DX fisioterapéutico'), T('Patrón APTA', { completo: true })),
      ],
      'Diagnóstico',
    ),
    S(
      11,
      'Pronóstico',
      [
        TB(
          'Pronóstico',
          [
            ['P.O.C', '140px'],
            ['Objetivo terapéutico', '1fr'],
            ['Método terapéutico', '1fr'],
            ['Teoría', '1fr'],
            ['Relación pronóstico-tiempo', '1fr'],
          ],
          ['Función', 'Funcionamiento', 'Funcionalidad'].map((h) => [h, IN, IN, IN, IN]),
        ),
      ],
      'Pronóstico',
    ),
    S(
      12,
      'Intervención',
      [
        F(
          K('Tipo de intervención', ['Preventiva', 'Compensatoria', 'Restaurativa']),
          A('Tratamiento piloto'),
          K('Herramientas', [
            'Ejercicio terapéutico',
            'Terapia manual',
            'Agentes físicos',
            'Educación',
          ]),
        ),
        SUB('Objetivos'),
        REF_OBJETIVOS,
        F(A('Corto'), A('Medio'), A('Largo plazo')),
      ],
      'Intervención',
    ),
  ],
  // SPEC C §11: la ficha infantil no tiene bloque de consentimiento ni firmas.
  firmas: [],
};
