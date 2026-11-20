import { datosCarlos, infantilesCompletos } from '../pruebas/fabricas.js';
import { calcularCamposFaltantes, puedeIniciarValoracion } from './completitud.js';
import type { DatosRepresentante } from './datos-personales.js';

const REPRESENTANTE: DatosRepresentante = {
  parentesco: 'MADRE',
  nombre: 'Laura',
  apellido: 'Martínez',
  cedula: '18220417',
  edad: 35,
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
    expect(
      calcularCamposFaltantes('REHAB_INFANTIL', datos, REPRESENTANTE, infantilesCompletos()),
    ).toEqual([]);
    expect(calcularCamposFaltantes('REHAB_INFANTIL', datos, null)).toContain(
      'representante.nombre',
    );
    expect(
      calcularCamposFaltantes(
        'REHAB_INFANTIL',
        datos,
        { ...REPRESENTANTE, ocupacion: '' },
        infantilesCompletos(),
      ),
    ).toEqual(['representante.ocupacion']);
  });
});

describe('calcularCamposFaltantes con modalidad (SPEC v1.4 §8.6)', () => {
  it('sin modalidad falta la modalidad', () => {
    expect(
      calcularCamposFaltantes(
        'TRAUMA_ADULTO',
        datosCarlos({ modalidad: null, idCentro: null }),
        null,
      ),
    ).toEqual(['modalidad']);
  });

  it('en centro sin centro elegido falta el centro', () => {
    expect(calcularCamposFaltantes('TRAUMA_ADULTO', datosCarlos({ idCentro: null }), null)).toEqual(
      ['idCentro'],
    );
  });

  it('a domicilio, Traumatología exige la dirección del paciente', () => {
    const datos = datosCarlos({ modalidad: 'DOMICILIO', idCentro: null });
    expect(calcularCamposFaltantes('TRAUMA_ADULTO', datos, null)).toEqual([
      'dirEstado',
      'dirMunicipio',
      'dirParroquia',
      'dirComunidad',
    ]);
    const conDireccion = {
      ...datos,
      dirEstado: 'Miranda',
      dirMunicipio: 'Sucre',
      dirParroquia: 'Petare',
      dirComunidad: 'Sector 3',
    };
    expect(calcularCamposFaltantes('TRAUMA_ADULTO', conDireccion, null)).toEqual([]);
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

describe('calcularCamposFaltantes: datos infantiles (v1.6 RF-028)', () => {
  const hogar = datosCarlos({
    dirEstado: 'Miranda',
    dirMunicipio: 'Sucre',
    dirParroquia: 'Petare',
    dirComunidad: 'Sector 3',
  });
  const representante = {
    parentesco: 'MADRE' as const,
    nombre: 'Laura',
    apellido: 'Martínez',
    cedula: '18220417',
    edad: 35,
    estadoCivil: 'Casado(a)',
    gradoInstruccion: 'Universitario',
    ocupacion: 'Docente',
  };

  it('sin antecedentes, datos al nacer ni exámenes faltan todos los obligatorios', () => {
    const faltantes = calcularCamposFaltantes('REHAB_INFANTIL', hogar, representante, null);
    expect(faltantes).toContain('infantil.controlPrenatal');
    expect(faltantes).toContain('infantil.edadGestacional');
    expect(faltantes).toContain('infantil.evaluadoOftalmologia');
  });

  it('Otras, Otros, Complicaciones, Transfusiones y las edades calculadas no se exigen', () => {
    const faltantes = calcularCamposFaltantes(
      'REHAB_INFANTIL',
      hogar,
      representante,
      infantilesCompletos({ vacunas: null }),
    );
    expect(faltantes).toEqual(['infantil.vacunas']);
  });

  it('en los tipos de adulto no se piden datos infantiles', () => {
    expect(calcularCamposFaltantes('TRAUMA_ADULTO', datosCarlos(), null, null)).toEqual([]);
  });
});
