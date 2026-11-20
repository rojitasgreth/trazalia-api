import { esquemaDatosPersonales } from './datos-personales.dto.js';

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
