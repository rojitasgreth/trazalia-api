import { normalizarDatosPersonales, normalizarRepresentante } from './normalizar.js';

describe('normalizarDatosPersonales', () => {
  it('recorta textos, vacía los blancos y deja la cédula solo con dígitos', () => {
    const datos = normalizarDatosPersonales('TRAUMA_ADULTO', {
      nombre: '  Carlos ',
      apellido: 'Andrade',
      nacionalidad: 'V',
      cedula: '15.482.301',
      ocupacion: '   ',
      telefono: ' 04125550134 ',
    });

    expect(datos).toMatchObject({
      nombre: 'Carlos',
      cedula: '15482301',
      ocupacion: null,
      telefono: '04125550134',
      fuenteInformacion: [],
    });
  });

  it('anula los campos que la ficha del tipo no contempla (§9.1)', () => {
    const datos = normalizarDatosPersonales('TRAUMA_ADULTO', {
      nombre: 'Carlos',
      apellido: 'Andrade',
      nivelEducativo: 'Universitario',
      dirEstado: 'Miranda',
      fuenteInformacion: ['Paciente'],
      demandasFisicas: 'Carga de peso',
    });

    expect(datos.nivelEducativo).toBeNull();
    expect(datos.dirEstado).toBeNull();
    expect(datos.fuenteInformacion).toEqual([]);
    expect(datos.demandasFisicas).toBe('Carga de peso');
  });

  it('conserva la fuente de información de Neurología sin repetir opciones', () => {
    const datos = normalizarDatosPersonales('NEURO_ADULTO', {
      nombre: 'Carlos',
      apellido: 'Andrade',
      fuenteInformacion: ['Paciente', 'Familiar', 'Paciente'],
    });
    expect(datos.fuenteInformacion).toEqual(['Paciente', 'Familiar']);
  });

  it('RF-025: ignora "Sin documento" en adultos', () => {
    const datos = normalizarDatosPersonales('ADULTO_MAYOR', {
      nombre: 'Carmen',
      apellido: 'Villegas',
      sinDocumento: true,
      nacionalidad: 'V',
    });
    expect(datos.sinDocumento).toBe(false);
    expect(datos.nacionalidad).toBe('V');
  });

  it('infantil sin documento deja la nacionalidad pendiente (nula)', () => {
    const datos = normalizarDatosPersonales('REHAB_INFANTIL', {
      nombre: 'Sofía',
      apellido: 'Martínez',
      sinDocumento: true,
      nacionalidad: 'V',
    });
    expect(datos.sinDocumento).toBe(true);
    expect(datos.nacionalidad).toBeNull();
  });
});

describe('normalizarDatosPersonales con modalidad (SPEC v1.4 §8.6)', () => {
  const base = { nombre: 'Carlos', apellido: 'Andrade', dirEstado: 'Miranda' as const };

  it('a domicilio conserva la dirección en Traumatología y anula el centro', () => {
    const datos = normalizarDatosPersonales('TRAUMA_ADULTO', {
      ...base,
      modalidad: 'DOMICILIO',
      idCentro: '7d1c5e2a-0000-4000-8000-0000000000c1',
    });
    expect(datos).toMatchObject({ modalidad: 'DOMICILIO', dirEstado: 'Miranda', idCentro: null });
  });

  it('en centro conserva el centro y, en Traumatología, no la dirección', () => {
    const datos = normalizarDatosPersonales('TRAUMA_ADULTO', {
      ...base,
      modalidad: 'CENTRO',
      idCentro: '7d1c5e2a-0000-4000-8000-0000000000c1',
    });
    expect(datos).toMatchObject({
      modalidad: 'CENTRO',
      idCentro: '7d1c5e2a-0000-4000-8000-0000000000c1',
      dirEstado: null,
    });
  });

  it('Adulto mayor mantiene la residencia con cualquier modalidad', () => {
    const datos = normalizarDatosPersonales('ADULTO_MAYOR', { ...base, modalidad: 'CENTRO' });
    expect(datos.dirEstado).toBe('Miranda');
  });
});

describe('normalizarRepresentante (SPEC §8.4)', () => {
  it('normaliza los datos del representante infantil', () => {
    expect(
      normalizarRepresentante('REHAB_INFANTIL', {
        parentesco: 'PADRE',
        nombre: ' José ',
        cedula: 'V-12.345.678',
        ocupacion: '  ',
      }),
    ).toEqual({
      parentesco: 'PADRE',
      nombre: 'José',
      apellido: null,
      cedula: '12345678',
      fechaNacimiento: null,
      estadoCivil: null,
      gradoInstruccion: null,
      ocupacion: null,
    });
  });

  it('un representante vacío o en un tipo de adulto es null', () => {
    expect(normalizarRepresentante('REHAB_INFANTIL', { nombre: ' ', apellido: null })).toBeNull();
    expect(normalizarRepresentante('REHAB_INFANTIL', null)).toBeNull();
    expect(normalizarRepresentante('NEURO_ADULTO', { nombre: 'Laura' })).toBeNull();
  });
});
