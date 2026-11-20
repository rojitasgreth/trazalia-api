import type { HistoriaDetalle } from '../../historias/vista/historia-vista.js';
import type { FuenteDato } from '../fichas/dsl.js';

// SPEC C §5: los datos personales se muestran en la valoración en solo lectura,
// tomados de la historia. Se formatean aquí, una sola vez, como los mostrará la
// ficha; al finalizar se guarda este mismo objeto como foto (decisión del 19-11-2026).

export type DatosDeLaFicha = Record<FuenteDato, string>;

function fecha(iso: string | null): string {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function mesesEntre(nacimiento: string, hoy: Date): number {
  const [a, m, d] = nacimiento.split('-').map(Number) as [number, number, number];
  let meses = (hoy.getUTCFullYear() - a) * 12 + (hoy.getUTCMonth() + 1 - m);
  if (hoy.getUTCDate() < d) meses--;
  return meses;
}

/** "41 años"; en infantil "6 años 9 meses" (o la edad cronológica corregida a mano). */
export function edadDeLaFicha(h: HistoriaDetalle, hoy: Date): string {
  if (h.tipo === 'REHAB_INFANTIL' && h.datosInfantiles?.edadCronologica) {
    return h.datosInfantiles.edadCronologica;
  }
  const nacimiento = h.datos.fechaNacimiento;
  if (!nacimiento) return '';
  const meses = mesesEntre(nacimiento, hoy);
  if (meses < 0) return '';
  const anios = Math.floor(meses / 12);
  if (h.tipo !== 'REHAB_INFANTIL') return `${anios} ${anios === 1 ? 'año' : 'años'}`;
  const resto = meses % 12;
  const textoAnios = anios ? `${anios} ${anios === 1 ? 'año' : 'años'}` : '';
  const textoMeses = resto || !anios ? `${resto} ${resto === 1 ? 'mes' : 'meses'}` : '';
  return [textoAnios, textoMeses].filter(Boolean).join(' ');
}

function documento(h: HistoriaDetalle): string {
  if (h.datos.sinDocumento) return 'Sin documento';
  if (!h.datos.cedula) return '';
  const miles = h.datos.cedula.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return h.datos.nacionalidad ? `${h.datos.nacionalidad}-${miles}` : miles;
}

const unir = (partes: (string | null)[], separador: string) =>
  partes.filter(Boolean).join(separador);

export function datosDeLaFicha(h: HistoriaDetalle, hoy: Date): DatosDeLaFicha {
  const d = h.datos;
  return {
    nombre: `${d.nombre} ${d.apellido}`.trim(),
    documento: documento(h),
    fechaNacimiento: fecha(d.fechaNacimiento),
    edad: edadDeLaFicha(h, hoy),
    sexo: d.sexo === 'FEMENINO' ? 'Femenino' : d.sexo === 'MASCULINO' ? 'Masculino' : '',
    dominancia: d.dominancia ?? '',
    ocupacion: d.ocupacion ?? '',
    demandasFisicas: d.demandasFisicas ?? '',
    telefono: d.telefono ?? '',
    contacto: unir([d.contactoNombre, d.contactoParentesco, d.contactoTelefono], ' · '),
    nivelEducativo: d.nivelEducativo ?? '',
    fuenteInformacion: d.fuenteInformacion.join(', '),
    estadoCivil: d.estadoCivil ?? '',
    lugarNacimiento: d.lugarNacimiento ?? '',
    residencia: unir([d.dirParroquia, d.dirMunicipio, d.dirEstado], ', '),
    nacionalidad: d.nacionalidad ?? '',
    contactoNombre: d.contactoNombre ?? '',
    contactoParentesco: d.contactoParentesco ?? '',
    contactoTelefono: d.contactoTelefono ?? '',
  };
}
