import { esquemaDatosInfantiles } from './datos-infantiles.dto.js';
import { esquemaDatosPersonales } from './datos-personales.dto.js';
import { esquemaRepresentante } from './representante.dto.js';

describe('decisión del 24-11-2026: la cédula solo admite números', () => {
  const paciente = (cedula: string) =>
    esquemaDatosPersonales.safeParse({ nombre: 'Ana', apellido: 'Pérez', cedula }).success;
  const representante = (cedula: string) => esquemaRepresentante.safeParse({ cedula }).success;

  it.each([paciente, representante])('acepta hasta 9 dígitos, con puntos de miles', (con) => {
    expect(con('15482301')).toBe(true);
    expect(con('15.482.301')).toBe(true);
    expect(con('123456789')).toBe(true);
    expect(con('')).toBe(true);
  });

  it.each([paciente, representante])('rechaza letras y más de 9 dígitos', (con) => {
    expect(con('V15482301')).toBe(false);
    expect(con('12abc')).toBe(false);
    expect(con('1234567890')).toBe(false);
  });
});

describe('decisión del 24-11-2026: datos al nacer con formato', () => {
  const con = (datos: Record<string, unknown>) => esquemaDatosInfantiles.safeParse(datos).success;

  it('peso y talla son decimales dentro de un rango amplio', () => {
    expect(con({ peso: '3,2', talla: '49.5' })).toBe(true);
    expect(con({ peso: '', talla: null })).toBe(true);
    expect(con({ peso: '3,2 kg' })).toBe(false);
    expect(con({ peso: '32' })).toBe(false);
    expect(con({ talla: '150' })).toBe(false);
  });

  it('el tipo de sangre y los Sí/No solo admiten sus opciones', () => {
    expect(con({ tipoSangre: 'AB−', respiro: 'Sí', anemia: 'No' })).toBe(true);
    expect(con({ tipoSangre: 'O positivo' })).toBe(false);
    expect(con({ lloro: 'Sí, fuerte' })).toBe(false);
  });
});

describe('esquemaDatosPersonales: teléfonos', () => {
  const con = (telefono: string) =>
    esquemaDatosPersonales.safeParse({ nombre: 'Ana', apellido: 'Pérez', telefono }).success;

  it('acepta hasta 11 dígitos y el campo vacío', () => {
    expect(con('04125550134')).toBe(true);
    expect(con('')).toBe(true);
  });

  it('rechaza más de 11 dígitos o separadores', () => {
    expect(con('041255501345')).toBe(false);
    expect(con('0412-555-0134')).toBe(false);
  });

  it('aplica la misma regla al teléfono de contacto', () => {
    const resultado = esquemaDatosPersonales.safeParse({
      nombre: 'Ana',
      apellido: 'Pérez',
      contactoTelefono: '+58 412 5550134',
    });
    expect(resultado.success).toBe(false);
  });
});
