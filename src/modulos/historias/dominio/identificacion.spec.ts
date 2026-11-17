import { validarIdentificacion } from './identificacion.js';

const BASE = {
  nombre: 'Carlos',
  apellido: 'Andrade',
  nacionalidad: 'V' as const,
  cedula: '15482301',
  sinDocumento: false,
  fechaNacimiento: null,
};

describe('validarIdentificacion (SPEC §7.1, §9.2)', () => {
  it('acepta un adulto con nombre, apellido, V/E y cédula', () => {
    expect(validarIdentificacion('NEURO_ADULTO', BASE)).toEqual([]);
  });

  it('exige el apellido en todos los tipos (v1.3)', () => {
    for (const tipo of ['TRAUMA_ADULTO', 'REHAB_INFANTIL'] as const) {
      const errores = validarIdentificacion(tipo, { ...BASE, apellido: '  ' });
      expect(errores.map((e) => e.campo)).toContain('apellido');
    }
  });

  it('exige el nombre', () => {
    expect(validarIdentificacion('ADULTO_MAYOR', { ...BASE, nombre: '' })[0]?.campo).toBe('nombre');
  });

  it.each([
    ['sin nacionalidad', { nacionalidad: null }],
    ['sin cédula', { cedula: null }],
    ['marcado Sin documento', { sinDocumento: true, cedula: null, nacionalidad: null }],
  ])('RF-025/AC-004: rechaza un adulto %s', (_caso, cambios) => {
    const errores = validarIdentificacion('TRAUMA_ADULTO', { ...BASE, ...cambios });
    expect(errores).toEqual([
      {
        campo: 'documento',
        mensaje:
          'Escribe la nacionalidad y el número de cédula. Son obligatorios para crear la historia.',
      },
    ]);
  });

  it('RF-004: infantil sin documento se crea con fecha de nacimiento', () => {
    const datos = {
      ...BASE,
      nacionalidad: null,
      cedula: null,
      sinDocumento: true,
      fechaNacimiento: '2022-06-10',
    };
    expect(validarIdentificacion('REHAB_INFANTIL', datos)).toEqual([]);
  });

  it('infantil sin documento exige la fecha de nacimiento', () => {
    const datos = { ...BASE, nacionalidad: null, cedula: null, sinDocumento: true };
    expect(validarIdentificacion('REHAB_INFANTIL', datos)[0]?.campo).toBe('fechaNacimiento');
  });

  it('infantil no admite "Sin documento" con un número de cédula', () => {
    const datos = { ...BASE, sinDocumento: true, fechaNacimiento: '2022-06-10' };
    expect(validarIdentificacion('REHAB_INFANTIL', datos)[0]?.campo).toBe('documento');
  });

  it('RF-005: infantil admite cédula con nacionalidad pendiente', () => {
    expect(validarIdentificacion('REHAB_INFANTIL', { ...BASE, nacionalidad: null })).toEqual([]);
  });

  it('rechaza una cédula que no sea de 1 a 9 dígitos', () => {
    const errores = validarIdentificacion('NEURO_ADULTO', { ...BASE, cedula: '1234567890' });
    expect(errores[0]?.mensaje).toBe('La cédula debe contener solo dígitos, máximo 9.');
  });
});
