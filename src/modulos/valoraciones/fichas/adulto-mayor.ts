import { A, AU, D, F, FORMATOS, G, I, IMC, K, N, NOTE, R, S, SUB, T, type Ficha } from './dsl.js';

// SPEC C §8.4 — ficha-viejos.docx, desde Datos de la evaluación hasta
// Consentimiento informado. "Alérgicos" figura dos veces en la ficha y se
// registra una sola vez, en su primera posición (SPEC C §7). Transcrito del prototipo.

const NOTA_DATOS =
  'Datos tomados de los datos personales de la historia. Se corrigen desde "Editar datos personales".';

export const FICHA_ADULTO_MAYOR_V1: Ficha = {
  tipo: 'ADULTO_MAYOR',
  version: 1,
  titulo: 'Ficha de evaluación fisioterapéutica – Adulto mayor',
  subtitulo: 'Basado en formato SOAP + Clasificación APTA',
  secciones: [
    S(
      1,
      'Datos de la evaluación',
      [F(AU('Fisioterapeuta', 'fisioterapeuta'), AU('Fecha de ingreso', 'fecha'))],
      'Datos de la evaluación',
    ),
    S(
      2,
      'Datos del paciente',
      [
        NOTE(NOTA_DATOS),
        F(
          I('Nombre y apellido', 'nombre'),
          I('Cédula', 'documento'),
          I('Sexo', 'sexo'),
          I('Edad', 'edad'),
          I('Fecha nacimiento', 'fechaNacimiento'),
          I('Estado civil', 'estadoCivil'),
          I('Lugar nacimiento', 'lugarNacimiento'),
          I('Residencia', 'residencia'),
          I('Teléfono', 'telefono'),
          I('Dominancia', 'dominancia'),
          I('Ocupación', 'ocupacion'),
          I('Nacionalidad', 'nacionalidad'),
          I('Grado de instrucción', 'nivelEducativo'),
        ),
      ],
      'Datos del paciente',
    ),
    S(
      3,
      'Datos del familiar',
      [
        F(
          I('Nombre', 'contactoNombre'),
          I('Parentesco', 'contactoParentesco'),
          I('Teléfono', 'contactoTelefono'),
        ),
      ],
      'Datos del familiar',
    ),
    S(
      4,
      'Medidas antropométricas y signos vitales',
      [
        F(
          N('Peso', 'kg'),
          N('Estatura', 'cm'),
          N('Frecuencia cardíaca', 'lpm'),
          G('Presión arterial', [
            { l: 'Sistólica', u: '/', f: FORMATOS.entero(40, 300) },
            { l: 'Diastólica', u: 'mmHg', f: FORMATOS.entero(20, 200) },
          ]),
          N('Frecuencia respiratoria', 'rpm'),
          N('SatO₂', '%'),
          N('Temperatura', '°C'),
          IMC(
            'IMC',
            'Se calcula con el peso y la estatura. Puedes corregirlo.',
            's4.peso',
            's4.estatura',
          ),
        ),
      ],
      'Medidas y signos vitales',
    ),
    S(
      5,
      'S — Subjetivo',
      [
        F(
          A('Motivo de consulta'),
          T('Dx Médico'),
          T('Médico tratante'),
          T('Alérgicos'),
          T('Antecedentes quirúrgicos'),
          T('Traumatismo'),
          T('Enfermedades crónicas'),
          T('Medicamentos'),
        ),
      ],
      'S — Subjetivo',
    ),
    S(
      6,
      'Semiol. del dolor (ALICIA)',
      [
        F(
          T('Antigüedad'),
          T('Localización'),
          T('Irradiación'),
          T('Carácter'),
          T('Intensidad'),
          T('Atenuantes'),
          T('Agravantes'),
        ),
      ],
      'Semiología del dolor',
    ),
    S(
      7,
      'O — Objetivo',
      [F(A('Inspección'), A('AMA'), A('Fuerza muscular'), A('Sistema tegumentario'))],
      'O — Objetivo',
    ),
    S(
      8,
      'Cribado funcional (ICOPE - OMS)',
      [
        F(
          R('Movilidad', ['Conservada', 'Disminuida']),
          R('Cognición', ['Intacta', 'Alterada']),
          R('Estado emocional', ['Normal', 'Depresión']),
          R('Nutrición', ['Adecuada', 'Riesgo']),
          R('Visión', ['Conservada', 'Alterada']),
          R('Audición', ['Conservada', 'Alterada']),
        ),
      ],
      'Cribado funcional ICOPE',
    ),
    S(
      9,
      'Pruebas funcionales',
      [
        F(
          N('Índice Barthel', '/100'),
          N('Índice Lawton', '/8'),
          N('TUG', 'seg'),
          N('5-STS', 'seg'),
          N('SPPB', '/12'),
          N('Vel. Marcha (4m)', 'm/s'),
          A('Observación marcha'),
        ),
      ],
      'Pruebas funcionales',
    ),
    S(
      10,
      'A — Assessment',
      [
        F(A('Impresión clínica'), A('Dx fisioterapéutico')),
        SUB('Patrones APTA'),
        F(
          K('Musculoesquelético', ['Fuerza', 'Rango', 'Dolor', 'Rigidez']),
          K('Neuromuscular', ['Postura', 'Equilibrio', 'Coordinación', 'Marcha']),
          K('Cardiopulmonar', ['Tolerancia', 'Disnea', 'Desacondicionamiento']),
          K('Integumentario', ['Úlceras', 'Cicatrices', 'Fragilidad']),
          K('Funcional', ['Dependencia parcial', 'Caídas', 'Limitación']),
        ),
      ],
      'A — Assessment',
    ),
    S(
      11,
      'P — Plan',
      [
        F(
          A('Objetivos SMART'),
          A('Intervenciones propuestas'),
          A('Entrenamiento cuidador/familia'),
          A('Recomendaciones'),
          A('Ayudas técnicas'),
          A('Modificaciones entorno'),
        ),
      ],
      'P — Plan',
    ),
    S(
      12,
      'Consentimiento informado',
      [
        NOTE(
          'Yo ____, C.I. ____, doy fe que la información suministrada es veraz. El fisioterapeuta ha realizado la evaluación con mi consentimiento y me ha explicado el diagnóstico, pronóstico y plan de tratamiento, el día ____.',
        ),
        F(
          T('Yo (nombre)', { predeterminado: 'nombre' }),
          T('C.I.', { predeterminado: 'documento' }),
          D('El día'),
        ),
        NOTE(
          'Las firmas se hacen sobre la ficha impresa: fisioterapeuta (nombre, firma y sello) y paciente (firma, CI y fecha).',
        ),
      ],
      'Consentimiento informado',
    ),
  ],
  firmas: [
    { titulo: 'Fisioterapeuta', quien: 'fisioterapeuta', indicacion: 'Nombre · Firma · Sello' },
    { titulo: 'Paciente', quien: 'paciente', indicacion: 'Firma · CI · Fecha' },
  ],
};
