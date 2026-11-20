import { A, AU, blank, D, F, G, I, IN, K, NOTE, R, S, SUB, T, TB, type Ficha } from './dsl.js';

// SPEC C §8.1 — traumatologia-adulto.docx, secciones 1 a 10 y consentimiento.
// Transcrito del prototipo (Valoracion.dc.html, defs.trauma), sin los valores de ejemplo.

const NOTA_DATOS =
  'Datos tomados de los datos personales de la historia. Se corrigen desde "Editar datos personales".';

const banderas = [
  'Trauma de alta energía / sospecha fractura',
  'Dolor desproporcionado/progresivo',
  'Fiebre / signos sistémicos',
  'Antecedente oncológico / pérdida de peso inexplicada',
  'Déficit neurológico nuevo/progresivo',
  'Alteración vascular / extremidad fría, pálida o sin pulso',
  'Edema súbito / sospecha TVP',
  'Herida/infección/secreción',
  'Disnea/dolor torácico/síncope',
  'Síndrome compartimental / dolor con estiramiento',
  'Alteración esfinteriana / cauda equina',
];

const NA = { r: ['N', 'Alt.'] };

export const FICHA_TRAUMA_V1: Ficha = {
  tipo: 'TRAUMA_ADULTO',
  version: 1,
  titulo: 'Ficha de valoración fisioterapéutica – Traumatología del adulto',
  subtitulo: 'SOAP + APTA/ICF | musculoesquelética, traumática, postoperatoria y funcional',
  secciones: [
    S(
      1,
      '1. Identificación',
      [
        NOTE(NOTA_DATOS),
        F(
          I('Paciente', 'nombre'),
          I('C.I./ID', 'documento'),
          I('Fecha nacimiento', 'fechaNacimiento'),
          I('Edad', 'edad'),
          I('Sexo', 'sexo'),
          I('Dominancia', 'dominancia'),
          I('Ocupación/deporte', 'ocupacion'),
          I('Demandas físicas', 'demandasFisicas'),
          I('Teléfono', 'telefono'),
          I('Contacto emergencia', 'contacto'),
        ),
        F(
          AU('Fisioterapeuta', 'fisioterapeuta'),
          AU('Fecha/hora', 'fechaHora'),
          T('Médico tratante'),
          T('Centro/servicio'),
        ),
      ],
      '1. Identificación',
    ),
    S(
      2,
      '2. Diagnóstico, mecanismo y antecedentes',
      [
        F(
          A('Motivo de consulta / expectativa'),
          A('Dx médico / imagen disponible'),
          D('Fecha lesión/cirugía'),
          K('Mecanismo', [
            'Directo',
            'Torsión',
            'Caída',
            'Accidente vial',
            'Sobrecarga',
            'Deportivo',
            'Otro',
          ]),
          R('Fase', ['Aguda', 'Subaguda', 'Crónica', 'Postoperatoria'], { completo: true }),
          A('Cirugía / osteosíntesis / restricciones'),
          K('Antecedentes', [
            'Traumáticos',
            'Quirúrgicos',
            'Reumatológicos',
            'Metabólicos',
            'Neurológicos',
            'Otros',
          ]),
          A('Medicamentos / alergias'),
          A('Actividad física / trabajo'),
        ),
      ],
      '2. Diagnóstico y antecedentes',
    ),
    S(
      3,
      '3. S – Anamnesis y dolor',
      [
        F(
          A('Inicio y evolución'),
          K('Síntomas', [
            'Dolor',
            'Rigidez',
            'Debilidad',
            'Edema',
            'Inestabilidad',
            'Bloqueo',
            'Parestesia',
          ]),
          G('Dolor NRS 0–10', [
            { l: 'Actual', u: '/10' },
            { l: 'Mejor', u: '/10' },
            { l: 'Peor', u: '/10' },
          ]),
          G('ALICIA / SOCRATES', [
            { l: 'Inicio', w: 150 },
            { l: 'Localización', w: 150 },
            { l: 'Irradiación', w: 150 },
            { l: 'Carácter', w: 150 },
            { l: 'Intensidad', w: 150 },
            { l: 'Atenuantes', w: 150 },
            { l: 'Agravantes', w: 150 },
          ]),
          K('Patrón 24 h', ['Mecánico', 'Inflamatorio', 'Nocturno', 'Reposo', 'Variable']),
          R('Sueño', ['Conservado', 'Interrumpido']),
          A('Objetivos del paciente'),
        ),
      ],
      '3. Anamnesis y dolor',
    ),
    S(
      4,
      '4. Cribado de seguridad / banderas rojas',
      [
        TB(
          'Cribado de seguridad / banderas rojas',
          [
            ['Hallazgo', '1.4fr'],
            ['Sí/No', '160px'],
            ['Conducta / detalle', '1fr'],
          ],
          banderas.map((h) => [h, { r: ['Sí', 'No'] }, IN]),
        ),
      ],
      '4. Banderas rojas',
    ),
    S(
      5,
      '5. Signos vitales y antropometría',
      [
        TB(
          'Signos vitales y antropometría',
          [
            ['Variable', '150px'],
            ['Reposo', '1.3fr'],
            ['Durante prueba', '1fr'],
            ['Recuperación', '1fr'],
          ],
          [
            ['PA mmHg', { i: 1, ph: '___/___' }, { i: 1, ph: '___/___' }, { i: 1, ph: '___/___' }],
            ['FC lpm', IN, IN, IN],
            ['FR rpm', IN, IN, IN],
            ['SpO₂ %', IN, IN, IN],
            ['Temp °C', IN, '—', IN],
            [
              'Peso/talla/IMC',
              {
                m: [
                  { l: 'Peso', u: 'kg' },
                  { l: 'Talla', u: 'cm' },
                  { l: 'IMC', calc: true },
                ],
              },
              '—',
              '—',
            ],
          ],
        ),
        NOTE('El IMC se calcula con el peso y la talla; puedes corregirlo.'),
      ],
      '5. Signos vitales',
    ),
    S(
      6,
      '6. O – Examen físico',
      [
        F(
          K(
            '6.1 Inspección',
            [
              'Postura/alineación',
              'Marcha',
              'Asimetrías',
              'Atrofia/hipertrofia',
              'Edema',
              'Equimosis',
              'Cicatriz/herida',
              'Deformidad',
              'Apoyo/descarga',
              'Órtesis/ayudas',
              'Conducta de protección',
            ],
            { otroLibre: true },
          ),
        ),
        SUB('6.2 Palpación y tejidos'),
        TB(
          'Palpación y tejidos',
          [
            ['Región', '1.2fr'],
            ['Dolor', '110px'],
            ['Temp.', '150px'],
            ['Edema', '200px'],
            ['Textura/tono', '1fr'],
            ['Observaciones', '1fr'],
          ],
          blank(3, [
            IN,
            { i: 1, u: '/10' },
            { r: ['N', '↑', '↓'] },
            { r: ['0', '+', '++', '+++'] },
            IN,
            IN,
          ]),
        ),
        SUB('6.3 Rango de movimiento'),
        TB(
          'Rango de movimiento',
          [
            ['Movimiento', '1.3fr'],
            ['AROM D', '1fr'],
            ['AROM I', '1fr'],
            ['PROM D', '1fr'],
            ['PROM I', '1fr'],
            ['Dolor/fin de rango', '1.3fr'],
          ],
          blank(4, [
            IN,
            { i: 1, u: '°' },
            { i: 1, u: '°' },
            { i: 1, u: '°' },
            { i: 1, u: '°' },
            IN,
          ]),
        ),
        NOTE('Registrar instrumento y posición de prueba cuando sea pertinente.'),
        SUB('6.4 Fuerza y control motor'),
        TB(
          'Fuerza y control motor',
          [
            ['Grupo', '1.3fr'],
            ['MMT D 0–5', '1fr'],
            ['MMT I 0–5', '1fr'],
            ['Dolor', '1fr'],
            ['Fatigabilidad/compensación', '1.5fr'],
          ],
          blank(4, [IN, IN, IN, IN, IN]),
        ),
        SUB('6.5 Examen neurovascular periférico'),
        TB(
          'Examen neurovascular periférico',
          [
            ['Componente', '1.2fr'],
            ['D', '1fr'],
            ['I', '1fr'],
            ['Comentarios', '1.2fr'],
          ],
          [
            ['Sensibilidad', NA, NA, IN],
            ['Miotomas/nervios', NA, NA, IN],
            ['Reflejos pertinentes', NA, NA, IN],
            ['Pulsos', { r: ['N', '↓', 'Aus.'] }, { r: ['N', '↓', 'Aus.'] }, IN],
            ['Llenado capilar', { i: 1, u: 's' }, { i: 1, u: 's' }, IN],
            ['Color/temperatura', NA, NA, IN],
          ],
        ),
        SUB('6.6 Pruebas especiales'),
        TB(
          'Pruebas especiales',
          [
            ['Prueba/región', '1.3fr'],
            ['Resultado', '220px'],
            ['Interpretación', '1fr'],
            ['Decisión', '1fr'],
          ],
          blank(3, [IN, { r: ['+', '–', 'Dudoso'] }, IN, IN]),
        ),
        NOTE(
          'Seleccionar pruebas por hipótesis clínica; una prueba aislada no establece diagnóstico.',
        ),
      ],
      '6. Examen físico',
    ),
    S(
      7,
      '7. Función y participación – ICF',
      [
        TB(
          'Función y participación – ICF',
          [
            ['Área', '170px'],
            ['Limitación/hallazgo', '1fr'],
            ['Cuantificación', '1fr'],
            ['Meta', '1fr'],
          ],
          [
            'Transferencias',
            'Marcha',
            'Escaleras',
            'Alcanzar/manipular',
            'AVD/AIVD',
            'Trabajo/deporte',
            'Participación',
          ].map((a) => [a, IN, IN, IN]),
        ),
      ],
      '7. Función – ICF',
    ),
    S(
      8,
      '8. Medidas de resultado',
      [
        TB(
          'Medidas de resultado',
          [
            ['Constructo', '130px'],
            ['Instrumentos frecuentes', '1.3fr'],
            ['Basal / reevaluación', '1fr'],
          ],
          [
            ['Dolor', 'NRS/VAS; BPI cuando proceda'],
            ['MI', 'LEFS; WOMAC; KOOS; HOOS; FAAM'],
            ['MS', 'DASH/QuickDASH; SPADI; PRWE'],
            ['Lumbar', 'ODI; Roland-Morris; PSFS'],
            ['Cuello', 'NDI'],
            ['Tobillo/Aquíles', 'FAAM; VISA-A según indicación'],
            ['Función global', 'PSFS; PROMIS Physical Function'],
            ['Psicosocial', 'OSPRO-YF; PCS/TSK/FABQ según indicación'],
            ['Rendimiento', 'TUG; 5xSTS; 30-s chair stand; marcha'],
          ].map(([c, i]) => [c!, i!, { m: [{ l: '' }, { l: '/' }] }]),
        ),
        NOTE(
          'Registrar versión/idioma, fecha, puntaje y cambio clínicamente importante cuando esté disponible. La selección debe seguir el constructo y la población, en línea con principios COSMIN.',
        ),
      ],
      '8. Medidas de resultado',
    ),
    S(
      9,
      '9. A – Assessment / diagnóstico fisioterapéutico',
      [
        F(
          A('Impresión clínica'),
          A('Diagnóstico diferencial fisioterapéutico'),
          A('Deficiencias'),
          A('Limitaciones de actividad'),
          A('Restricciones de participación'),
          A('Factores contextuales'),
          A('Pronóstico y justificación'),
          A('Necesidad de derivación/co-manejo'),
        ),
      ],
      '9. Assessment',
    ),
    S(
      10,
      '10. P – Plan',
      [
        F(
          A('Objetivo general'),
          G('Objetivos SMART', [
            { l: '1)', w: 260 },
            { l: '2)', w: 260 },
            { l: '3)', w: 260 },
          ]),
          G('Frecuencia/duración', [{ l: 'Sesiones/semana' }, { l: '× semanas' }]),
          K('Intervenciones', [
            'Educación',
            'Ejercicio',
            'Carga progresiva',
            'ROM',
            'Fuerza',
            'Neuromuscular',
            'Aeróbico',
            'Manual como complemento',
            'Otros',
          ]),
          G('Dosificación', [
            { l: 'Series' },
            { l: 'Reps' },
            { l: 'Intensidad', w: 110 },
            { l: 'RPE' },
            { l: 'Descanso' },
          ]),
          A('Programa domiciliario'),
          A('Criterios de progresión/regresión'),
          A('Retorno a trabajo/deporte'),
          D('Fecha de reevaluación'),
        ),
      ],
      '10. Plan',
    ),
    S(
      11,
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
