// Datos de prueba compartidos por las pruebas unitarias del módulo.
import type { DatosPersonales } from '../dominio/datos-personales.js';
import type { HistoriaConRepresentante } from '../repositorios/historia.repositorio.js';

/** Carlos Andrade, Traumatología del adulto, completo (prototipo B07/B23). */
export function datosCarlos(cambios: Partial<DatosPersonales> = {}): DatosPersonales {
  return {
    nombre: 'Carlos',
    apellido: 'Andrade',
    nacionalidad: 'V',
    cedula: '15482301',
    sinDocumento: false,
    fechaNacimiento: '1985-03-14',
    sexo: 'MASCULINO',
    dominancia: 'Diestro(a)',
    ocupacion: 'Contador · fútbol amateur',
    nivelEducativo: null,
    estadoCivil: null,
    lugarNacimiento: null,
    telefono: '0412-555-0134',
    correo: null,
    dirEstado: null,
    dirMunicipio: null,
    dirParroquia: null,
    dirComunidad: null,
    contactoNombre: 'Patricia Andrade',
    contactoParentesco: 'Esposa',
    contactoTelefono: '0414-555-2290',
    demandasFisicas: 'Oficina sentado 8 h al día',
    fuenteInformacion: [],
    ...cambios,
  };
}

export function filaHistoria(
  cambios: Partial<HistoriaConRepresentante> = {},
): HistoriaConRepresentante {
  const datos = datosCarlos();
  return {
    idHistoria: 'h1',
    idPaciente: 'p1',
    idFisioterapeuta: 'f1',
    tipo: 'TRAUMA_ADULTO',
    estado: 'BORRADOR',
    archivada: false,
    fechaArchivo: null,
    ...datos,
    fechaNacimiento: new Date('1985-03-14T00:00:00.000Z'),
    fechaCreacion: new Date('2026-11-16T12:00:00.000Z'),
    fechaActualizacion: new Date('2026-11-16T12:00:00.000Z'),
    representante: null,
    ...cambios,
  };
}
