import { normalizarDatosPersonales } from './normalizar.js';

describe('normalizarDatosPersonales', () => {
  it('recorta textos, vacía los blancos y deja la cédula solo con dígitos', () => {
    const datos = normalizarDatosPersonales('TRAUMA_ADULTO', {
      nombre: '  Carlos ',
      apellido: 'Andrade',
      nacionalidad: 'V',
      cedula: '15.482.301',
      ocupacion: '   ',
      telefono: ' 0412-555-0134 ',
    });

    expect(datos).toMatchObject({
      nombre: 'Carlos',
      cedula: '15482301',
      ocupacion: null,
      telefono: '0412-555-0134',
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
