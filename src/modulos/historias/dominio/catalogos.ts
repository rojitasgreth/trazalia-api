// Listas cerradas del formulario de datos personales (prototipo B, SPEC §8).
// Se guardan tal cual se muestran: son vocabulario del dominio, no códigos.

export const DOMINANCIAS = ['Diestro(a)', 'Zurdo(a)', 'Ambidiestro(a)'] as const;

export const NIVELES_EDUCATIVOS = [
  'Sin instrucción',
  'Primaria',
  'Bachillerato',
  'Técnico superior',
  'Universitario',
  'Postgrado',
] as const;

export const ESTADOS_CIVILES = [
  'Soltero(a)',
  'Casado(a)',
  'Unión estable',
  'Divorciado(a)',
  'Viudo(a)',
] as const;

// SPEC §8.2: casillas de Neurología del adulto; se puede marcar más de una.
export const FUENTES_INFORMACION = ['Paciente', 'Familiar', 'Historia', 'Mixta'] as const;

// SPEC §8.1: dirección estructurada. Las 24 entidades federales de Venezuela
// (el prototipo muestra solo una muestra).
export const ENTIDADES_FEDERALES = [
  'Amazonas',
  'Anzoátegui',
  'Apure',
  'Aragua',
  'Barinas',
  'Bolívar',
  'Carabobo',
  'Cojedes',
  'Delta Amacuro',
  'Distrito Capital',
  'Falcón',
  'Guárico',
  'La Guaira',
  'Lara',
  'Mérida',
  'Miranda',
  'Monagas',
  'Nueva Esparta',
  'Portuguesa',
  'Sucre',
  'Táchira',
  'Trujillo',
  'Yaracuy',
  'Zulia',
] as const;
