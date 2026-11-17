import { datosCarlos } from '../pruebas/fabricas.js';
import { calcularCamposFaltantes, puedeIniciarValoracion } from './completitud.js';
import type { DatosRepresentante } from './datos-personales.js';

const REPRESENTANTE: DatosRepresentante = {
  parentesco: 'MADRE',
  nombre: 'Laura',
  apellido: 'Martínez',
  cedula: '18220417',
  fechaNacimiento: '1991-07-30',
  estadoCivil: 'Casado(a)',
  gradoInstruccion: 'Universitario',
  ocupacion: 'Docente',
};

describe('calcularCamposFaltantes (SPEC §9.1)', () => {
  it('una historia de Traumatología completa no tiene faltantes', () => {
    expect(calcularCamposFaltantes('TRAUMA_ADULTO', datosCarlos(), null)).toEqual([]);
  });

  it('solo cuenta los campos de la ficha del tipo (Neurología: fuente y nivel educativo)', () => {
    // Prototipo B20: a la historia de Neurología de Carlos le faltan esos dos.
    expect(calcularCamposFaltantes('NEURO_ADULTO', datosCarlos(), null)).toEqual([
      'fuenteInformacion',
      'nivelEducativo',
    ]);
  });

  it('en Adulto mayor exige residencia y familiar de contacto', () => {
    const faltantes = calcularCamposFaltantes(
      'ADULTO_MAYOR',
      datosCarlos({ contactoTelefono: null }),
      null,
    );
    expect(faltantes).toEqual(
      expect.arrayContaining(['estadoCivil', 'dirEstado', 'dirComunidad', 'contactoTelefono']),
    );
  });

  it('el documento falta si no hay cédula ni "Sin documento"', () => {
    const datos = datosCarlos({ cedula: null, nacionalidad: null });
    expect(calcularCamposFaltantes('REHAB_INFANTIL', datos, REPRESENTANTE)).toContain('documento');
    const sinDoc = { ...datos, sinDocumento: true };
    expect(calcularCamposFaltantes('REHAB_INFANTIL', sinDoc, REPRESENTANTE)).not.toContain(
      'documento',
    );
  });

  it('RF-015: en infantil el representante es obligatorio; el correo no', () => {
    const datos = datosCarlos({
      dirEstado: 'Miranda',
      dirMunicipio: 'Sucre',
      dirParroquia: 'Petare',
      dirComunidad: 'Sector 3',
    });
    expect(calcularCamposFaltantes('REHAB_INFANTIL', datos, REPRESENTANTE)).toEqual([]);
    expect(calcularCamposFaltantes('REHAB_INFANTIL', datos, null)).toContain(
      'representante.nombre',
    );
    expect(
      calcularCamposFaltantes('REHAB_INFANTIL', datos, { ...REPRESENTANTE, ocupacion: '' }),
    ).toEqual(['representante.ocupacion']);
  });
});

describe('puedeIniciarValoracion (RF-016)', () => {
  it('solo en Borrador, no archivada y sin faltantes', () => {
    expect(puedeIniciarValoracion('BORRADOR', false, [])).toBe(true);
    expect(puedeIniciarValoracion('BORRADOR', false, ['telefono'])).toBe(false);
    expect(puedeIniciarValoracion('ACTIVA', false, [])).toBe(false);
    expect(puedeIniciarValoracion('BORRADOR', true, [])).toBe(false);
  });
});
