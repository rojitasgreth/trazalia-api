import { A, AU, blank, D, F, G, I, IN, K, N, NOTE, R, S, SUB, T, TB, type Ficha } from './dsl.js';

// SPEC C §8.2 y §8.2.1 — neurologica-adultos.docx, secciones 1 a 18 y
// consentimiento. Transcrito del prototipo (defs.neuro y SCALES).

const NOTA_DATOS =
  'Datos tomados de los datos personales de la historia. Se corrigen desde "Editar datos personales".';

/** §8.2.1: dominio, instrumento, constructo, unidad del puntaje (A|B = dos partes) y uso/nota. */
export const BANCO_ESCALAS: [string, string, string, string, string][] = [
  ['Marcha', '10 Meter Walk Test (10mWT)', 'Velocidad', 'm/s', 'Core ANPT; documentar ayuda'],
  ['Resistencia', '6 Minute Walk Test (6MWT)', 'Distancia', 'm', 'Core ANPT; registrar pausas'],
  ['Transferencia', '5 Times Sit-to-Stand', 'Transferencia/fuerza', 's', 'Core ANPT'],
  ['Equilibrio', 'Berg Balance Scale', 'Equilibrio', '/56', 'Core ANPT'],
  ['Marcha dinámica', 'Functional Gait Assessment', 'Marcha/equilibrio', '/30', 'Core ANPT'],
  ['Movilidad', 'Timed Up and Go', 'Movilidad', 's', 'Registrar dispositivo/asistencia'],
  ['Marcha', 'Dynamic Gait Index', 'Marcha dinámica', '/24', 'Según población'],
  ['Equilibrio', 'Mini-BESTest', 'Control postural', '/28', 'Sistemas de equilibrio'],
  [
    'Deambulación',
    'Functional Ambulation Category',
    'Asistencia marcha',
    '/5',
    'Frecuente post-ACV',
  ],
  ['Tronco', 'Trunk Impairment Scale', 'Control troncal', '', 'Frecuente post-ACV'],
  ['ACV', 'Fugl-Meyer Assessment', 'Déficit motor/sensitivo', '', 'Batería específica'],
  ['ACV brazo', 'Action Research Arm Test', 'Función UE', '/57', 'Registrar versión'],
  ['ACV discapacidad', 'Modified Rankin Scale', 'Discapacidad global', '/6', 'Principalmente ACV'],
  ['ACV severidad', 'NIH Stroke Scale', 'Déficit neurológico', '/42', 'Ámbito agudo'],
  ['ACV impacto', 'Stroke Impact Scale', 'Impacto percibido', '', 'Autoinforme'],
  ['Parkinson', 'MDS-UPDRS', 'Síntomas y función', '', 'Usar versión oficial'],
  ['Parkinson', 'Hoehn & Yahr', 'Estadio', '', 'Complementaria'],
  ['Parkinson', 'Schwab & England', 'Independencia ADL', '%', 'Complementaria'],
  ['Parkinson', 'Freezing of Gait Questionnaire', 'Freezing', '', 'Según versión'],
  ['EM', 'EDSS', 'Discapacidad', '/10', 'Aplicación especializada'],
  ['EM', 'MSIS-29', 'Impacto EM', '', 'Autoinforme'],
  ['EM', 'MSWS-12', 'Impacto en marcha', '', 'Autoinforme'],
  ['EM', 'Fatigue Severity Scale', 'Fatiga', '', 'Según versión'],
  ['LME', 'ISNCSCI / AIS 2026', 'Nivel/severidad LME', 'NLI|AIS', 'Usar hoja oficial'],
  ['LME', 'SCIM III', 'Autonomía específica LME', '/100', 'Función'],
  ['LME', 'WISCI II', 'Marcha LME', '/20', 'Ayuda/asistencia'],
  ['TCE', 'GOSE', 'Resultado funcional global', '/8', 'Según fase'],
  ['TCE/conmoción', 'Post-Concussion Symptom Scale', 'Síntomas', '', 'Según versión'],
  ['Cerebelo', 'SARA', 'Ataxia', '/40', 'Específica'],
  ['Cerebelo', 'ICARS', 'Ataxia', '/100', 'Más extensa'],
  ['Neuropatía', 'MRC Sum Score', 'Fuerza global', '', 'Neuropatías/GBS'],
  ['Neuropatía', 'INCAT Disability Score', 'Discapacidad', '', 'Según diagnóstico'],
  ['Espasticidad', 'Modified Ashworth Scale', 'Resistencia pasiva', '', 'Registrar segmento'],
  [
    'Espasticidad',
    'Modified Tardieu Scale',
    'Respuesta al estiramiento',
    'R1|R2',
    'Registrar velocidad',
  ],
  ['Cognición', 'MoCA', 'Cribado cognitivo', '/30', 'Usar versión validada'],
  ['Cognición', 'MMSE', 'Cribado cognitivo', '/30', 'Limitaciones en ejecutivo'],
  ['Ejecutivo', 'Frontal Assessment Battery', 'Función ejecutiva', '/18', 'Según indicación'],
  ['Depresión', 'PHQ-9', 'Síntomas depresivos', '', 'No diagnóstico por sí solo'],
  ['Ansiedad', 'GAD-7', 'Ansiedad', '', 'No diagnóstico por sí solo'],
  ['Dolor neuropático', 'DN4 / painDETECT', 'Cribado neuropático', '', 'No confirma etiología'],
  [
    'Confianza equilibrio',
    'Activities-specific Balance Confidence Scale',
    'Confianza',
    '%',
    'Autoinforme',
  ],
  ['Vestibular', 'Dizziness Handicap Inventory', 'Impacto del mareo', '/100', 'Vestibular'],
  ['Objetivos', 'Goal Attainment Scaling', 'Logro de metas', '', 'Personalizada'],
];

/** RF-C10: la casilla "Aplicada" (columna 1) habilita el puntaje (columna 5). */
function puntaje(unidad: string) {
  if (unidad.includes('|')) {
    const [a, b] = unidad.split('|');
    return { m: [{ l: a! }, { l: b! }], habilitadaPor: 0 };
  }
  return { i: 1 as const, ...(unidad ? { u: unidad } : {}), habilitadaPor: 0 };
}

const filas = (etiquetas: string[], celdas: number) =>
  etiquetas.map((h) => [h, ...Array<typeof IN>(celdas).fill(IN)]);

export const FICHA_NEURO_V1: Ficha = {
  tipo: 'NEURO_ADULTO',
  version: 1,
  titulo: 'Ficha de valoración fisioterapéutica – Neurología del adulto',
  subtitulo:
    'SOAP + APTA/ICF | examen neurológico integral, función, marcha, equilibrio y banco de escalas',
  secciones: [
    S(
      1,
      '1. Identificación y fuente de información',
      [
        NOTE(NOTA_DATOS),
        F(
          I('Paciente', 'nombre'),
          I('C.I./ID', 'documento'),
          I('Nacimiento', 'fechaNacimiento'),
          I('Edad', 'edad'),
          I('Sexo', 'sexo'),
          I('Dominancia', 'dominancia'),
          I('Ocupación', 'ocupacion'),
          I('Nivel educativo', 'nivelEducativo'),
          I('Cuidador/contacto', 'contacto'),
          I('Teléfono', 'telefono'),
        ),
        F(
          AU('Fisioterapeuta', 'fisioterapeuta'),
          AU('Fecha/hora', 'fechaHora'),
          T('Neurólogo/médico'),
          I('Fuente', 'fuenteInformacion'),
        ),
      ],
      '1. Identificación',
    ),
    S(
      2,
      '2. S – Anamnesis neurológica',
      [
        F(
          A('Dx médico/etiología'),
          K('Inicio y curso', [
            'Agudo',
            'Subagudo',
            'Crónico estable',
            'Progresivo',
            'Fluctuante',
            'Recurrente',
          ]),
          A('Motivo/prioridades'),
          K('Antecedentes', [
            'ACV',
            'TCE',
            'LME',
            'EM',
            'Parkinson',
            'Neuropatía',
            'Epilepsia',
            'Tumor',
            'Infección',
            'Otros',
          ]),
          A('Cirugías/hospitalizaciones'),
          A('Medicamentos'),
          G('Dolor', [
            { l: 'Localización', w: 200 },
            { l: 'NRS', u: '/10' },
            { l: 'Carácter', w: 200 },
          ]),
          A('Fatiga/sueño'),
          A('Visión/audición'),
          A('Lenguaje/comunicación'),
          K('Deglución/nutrición', ['Sin dificultad', 'Sospecha/disfagia', 'Dieta modificada']),
          A('Continencia/autonomía'),
          A('Cognición/conducta/ánimo'),
          G('Caídas', [{ l: 'N.º últimas 4 semanas' }, { l: 'Circunstancias', w: 320 }]),
          A('Ayudas técnicas/entorno'),
          A('Metas del paciente'),
        ),
      ],
      '2. Anamnesis',
    ),
    S(
      3,
      '3. Cribado de seguridad',
      [
        TB(
          'Cribado de seguridad',
          [
            ['Hallazgo', '1.3fr'],
            ['Sí/No', '160px'],
            ['Acción', '1fr'],
          ],
          [
            'Déficit neurológico súbito/progresivo',
            'Alteración nueva de conciencia',
            'Convulsión nueva/prolongada',
            'Cefalea nueva preocupante',
            'Disfagia/aspiración',
            'Compromiso respiratorio',
            'Disautonomía relevante',
            'Trauma/sospecha fractura',
          ].map((h) => [h, { r: ['Sí', 'No'] }, IN]),
        ),
      ],
      '3. Cribado de seguridad',
    ),
    S(
      4,
      '4. Signos vitales/tolerancia',
      [
        TB(
          'Signos vitales/tolerancia',
          [
            ['Variable', '130px'],
            ['Reposo', '1fr'],
            ['Prueba', '1fr'],
            ['Recuperación', '1fr'],
          ],
          [
            ['PA', { i: 1, ph: '___/___' }, { i: 1, ph: '___/___' }, { i: 1, ph: '___/___' }],
            ['FC', IN, IN, IN],
            ['FR', IN, IN, IN],
            ['SpO₂', { i: 1, u: '%' }, { i: 1, u: '%' }, { i: 1, u: '%' }],
            ['RPE Borg', IN, IN, IN],
            ['Fatiga', { i: 1, u: '/10' }, { i: 1, u: '/10' }, { i: 1, u: '/10' }],
          ],
        ),
      ],
      '4. Signos vitales',
    ),
    S(
      5,
      '5. Estado mental, cognición y comunicación',
      [
        F(
          R('Conciencia', ['Alerta', 'Somnolento', 'Confuso', 'Fluctuante'], { completo: true }),
          G('Orientación', [{ l: 'Persona' }, { l: 'Lugar' }, { l: 'Tiempo' }, { l: 'Situación' }]),
          T('Atención'),
          T('Memoria'),
          T('Ejecutivo'),
          K('Lenguaje', ['Normal', 'Afasia', 'Disartria', 'Apraxia']),
          T('Comunicación funcional'),
          T('Conducta/afecto'),
          T('Visuoespacial/negligencia'),
        ),
      ],
      '5. Estado mental',
    ),
    S(
      6,
      '6. Pares craneales – cribado dirigido',
      [
        TB(
          'Pares craneales',
          [
            ['Función', '1.4fr'],
            ['D', '1fr'],
            ['I', '1fr'],
            ['Observaciones', '1.2fr'],
          ],
          filas(
            [
              'II visión/campos',
              'III/IV/VI motilidad ocular',
              'V sensibilidad/masticación',
              'VII facial',
              'VIII audición/equilibrio',
              'IX/X voz/deglución',
              'XI trapecio/ECM',
              'XII lengua',
            ],
            3,
          ),
        ),
      ],
      '6. Pares craneales',
    ),
    S(
      7,
      '7. Examen motor',
      [
        TB(
          'Tono',
          [
            ['Región', '90px'],
            ['Tono', '170px'],
            ['Escala', '250px'],
            ['Resultado', '1fr'],
            ['Comentarios', '1fr'],
          ],
          ['MS D', 'MS I', 'MI D', 'MI I'].map((h) => [
            h,
            { r: ['↓', 'N', '↑'] },
            { r: ['MAS', 'Tardieu', 'Otra'] },
            IN,
            IN,
          ]),
        ),
        TB(
          'Fuerza (MRC)',
          [
            ['Grupo muscular', '1.3fr'],
            ['MRC D', '1fr'],
            ['MRC I', '1fr'],
            ['Dolor', '1fr'],
            ['Fatigabilidad', '1fr'],
          ],
          filas(
            ['Cintura escapular', 'Codo', 'Muñeca/mano', 'Cadera', 'Rodilla', 'Tobillo/pie'],
            4,
          ),
        ),
        TB(
          'Control motor/coordinación',
          [
            ['Control motor/coordinación', '1.4fr'],
            ['D', '1fr'],
            ['I', '1fr'],
            ['Observación', '1.2fr'],
          ],
          filas(
            [
              'Dedo-nariz',
              'Talón-rodilla',
              'Movimientos alternantes',
              'Prensión/liberación',
              'Control troncal',
            ],
            3,
          ),
        ),
      ],
      '7. Examen motor',
    ),
    S(
      8,
      '8. Sensibilidad',
      [
        TB(
          'Sensibilidad',
          [
            ['Modalidad', '1.3fr'],
            ['D', '1fr'],
            ['I', '1fr'],
            ['Distribución/patrón', '1.3fr'],
          ],
          filas(
            [
              'Tacto ligero',
              'Pin-prick',
              'Temperatura',
              'Vibración',
              'Propiocepción',
              'Estereognosia',
              'Grafestesia',
              'Extinción/negligencia',
            ],
            3,
          ),
        ),
      ],
      '8. Sensibilidad',
    ),
    S(
      9,
      '9. Reflejos y signos',
      [
        TB(
          'Reflejos y signos',
          [
            ['Reflejo/signo', '1.3fr'],
            ['D', '1fr'],
            ['I', '1fr'],
            ['Resultado', '1.2fr'],
          ],
          filas(
            [
              'Bicipital C5–6',
              'Tricipital C7',
              'Braquiorradial C6',
              'Rotuliano L3–4',
              'Aquíleo S1',
              'Plantar/Babinski',
              'Clonus',
              'Otros',
            ],
            3,
          ),
        ),
      ],
      '9. Reflejos',
    ),
    S(
      10,
      '10. Equilibrio, coordinación y vestibular/cerebeloso',
      [
        TB(
          'Equilibrio, coordinación y vestibular/cerebeloso',
          [
            ['Prueba', '1.3fr'],
            ['Resultado', '1fr'],
            ['Observaciones', '1fr'],
          ],
          filas(
            [
              'Romberg/variantes',
              'SARA/ICARS si procede',
              'Nistagmo',
              'Head impulse / VOR',
              'Dix-Hallpike / roll test si indicado',
              'Doble tarea',
            ],
            2,
          ),
        ),
      ],
      '10. Equilibrio',
    ),
    S(
      11,
      '11. Postura, transferencias y marcha',
      [
        F(
          T('Rodar/puente'),
          T('Sedestación'),
          T('Bipedestación'),
          T('Sit-to-stand'),
          T('Marcha/dispositivo/asistencia'),
          N('10MWT', 'm/s'),
          N('6MWT', 'm'),
          T('Escaleras'),
          T('Obstáculos/superficies'),
          T('Doble tarea'),
          T('Patrón de marcha'),
        ),
      ],
      '11. Postura y marcha',
    ),
    S(
      12,
      '12. Función de miembro superior',
      [
        TB(
          'Función de miembro superior',
          [
            ['Tarea', '1.2fr'],
            ['D', '1fr'],
            ['I', '1fr'],
            ['Comentarios', '1.2fr'],
          ],
          filas(
            [
              'Alcance',
              'Prensión',
              'Manipulación fina',
              'Vestido',
              'Alimentación',
              'Escritura/teclado',
            ],
            3,
          ),
        ),
      ],
      '12. Miembro superior',
    ),
    S(
      13,
      '13. Autonomía, respiración y deglución',
      [
        F(
          T('Tos/secreciones'),
          T('Disnea/ventilación'),
          T('Cribado deglución/derivación'),
          N('Barthel', '/100'),
          N('Lawton-Brody', '/8'),
          N('SCIM III si LME', '/100'),
          T('FIM si disponible/autorizada institucionalmente'),
          R('Necesidad de cuidador', ['No', 'Parcial', 'Total'], { completo: true }),
        ),
      ],
      '13. Autonomía',
    ),
    S(
      14,
      '14. Banco amplio de escalas y medidas de resultado',
      [
        NOTE(
          'La selección debe ser dirigida al diagnóstico y constructo. No se deben aplicar todas en un mismo paciente. Registrar versión/idioma, fecha y condiciones de administración. Marca las escalas aplicadas para anotar su puntaje.',
        ),
        TB(
          'Banco amplio de escalas',
          [
            ['Aplicada', '80px'],
            ['Dominio', '130px'],
            ['Instrumento', '1.5fr'],
            ['Constructo', '1.1fr'],
            ['Puntaje', '190px'],
            ['Uso/nota', '1.2fr'],
          ],
          BANCO_ESCALAS.map(([dominio, instrumento, constructo, unidad, nota]) => [
            { ck: 1, etiqueta: `Aplicada: ${instrumento}` },
            dominio,
            { t: instrumento, destacado: true },
            constructo,
            puntaje(unidad),
            nota,
          ]),
        ),
      ],
      '14. Banco de escalas',
    ),
    S(
      15,
      '15. Registro de escalas aplicadas',
      [
        TB(
          'Registro de escalas aplicadas',
          [
            ['Instrumento', '1.3fr'],
            ['Versión/idioma', '1fr'],
            ['Fecha', '150px'],
            ['Basal', '90px'],
            ['Reevaluación', '110px'],
            ['Cambio/interpretación', '1.2fr'],
          ],
          blank(5, [IN, IN, { i: 1, tipo: 'fecha' }, IN, IN, IN]),
        ),
      ],
      '15. Registro de escalas',
    ),
    S(
      16,
      '16. Lesión medular – ISNCSCI/AIS',
      [
        NOTE(
          'Esta ficha no reproduce ni modifica la hoja oficial: se registra el resultado y se adjunta la hoja ISNCSCI vigente.',
        ),
        F(
          G('Fecha/hora', [
            { l: 'Fecha', tipo: 'fecha', w: 160 },
            { l: 'Hora', tipo: 'hora', w: 120 },
          ]),
          T('NLI'),
          T('Sensitivo D/I'),
          T('Motor D/I'),
          R('AIS', ['A', 'B', 'C', 'D', 'E'], { completo: true }),
          T('Completa/incompleta'),
          T('ZPP'),
          R('VAC', ['Sí', 'No']),
          R('DAP', ['Sí', 'No']),
          R('Hoja oficial adjunta', ['Sí', 'No']),
        ),
      ],
      '16. Lesión medular',
    ),
    S(
      17,
      '17. A – Assessment / diagnóstico fisioterapéutico',
      [
        F(
          A('Impresión clínica'),
          A('Diagnóstico fisioterapéutico'),
          A('Deficiencias'),
          A('Limitaciones de actividad'),
          A('Restricciones de participación'),
          A('Factores contextuales'),
          A('Pronóstico'),
          R('Riesgo de caídas', ['Bajo', 'Moderado', 'Alto']),
          T('Escala (riesgo de caídas)'),
          A('Necesidad interdisciplinaria'),
        ),
      ],
      '17. Assessment',
    ),
    S(
      18,
      '18. P – Plan',
      [
        F(
          A('Objetivo general'),
          G('Objetivos SMART', [
            { l: '1)', w: 260 },
            { l: '2)', w: 260 },
            { l: '3)', w: 260 },
          ]),
          A('Educación'),
          A('Locomoción/marcha'),
          A('Fuerza/resistencia'),
          A('Equilibrio/control postural'),
          A('Miembro superior'),
          A('ROM/movilidad'),
          A('Tono/espasticidad'),
          A('Aeróbico/acondicionamiento'),
          A('Respiratorio'),
          A('Cuidador'),
          A('Órtesis/FES/ayudas'),
          A('Programa domiciliario'),
          A('Frecuencia/dosificación'),
          A('Criterios de seguridad/progresión'),
          D('Reevaluación'),
        ),
      ],
      '18. Plan',
    ),
    S(
      19,
      'Consentimiento y firmas',
      [
        F(
          R('Consentimiento informado', ['Sí', 'No']),
          D('Fecha'),
          R('Educación al paciente/familia', ['Realizada', 'Pendiente']),
          R('Derivación / alerta médica', ['No', 'Sí']),
          T('Detalle de la derivación / alerta', { ph: 'Solo si marcaste Sí' }),
        ),
        SUB('Firmas'),
        NOTE('Las firmas se hacen sobre la ficha impresa. Aquí se registran los nombres.'),
        F(
          AU('Fisioterapeuta: Nombre', 'fisioterapeuta'),
          T('Paciente / representante: Nombre', { predeterminado: 'nombre' }),
        ),
      ],
      'Consentimiento y firmas',
    ),
  ],
  firmas: [
    {
      titulo: 'Fisioterapeuta',
      quien: 'fisioterapeuta',
      indicacion: 'Nombre · Firma/sello · Fecha',
    },
    { titulo: 'Paciente / representante', quien: 'paciente', indicacion: 'Nombre · Firma · Fecha' },
  ],
};
