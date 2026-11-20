import { esquemaActualizarUsuario } from './actualizar-usuario.dto.js';
import { esquemaCrearUsuario } from './crear-usuario.dto.js';

const BASE = {
  nacionalidad: 'V',
  cedula: '123456789',
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana@ejemplo.com',
  rol: 'FISIOTERAPEUTA',
};

describe('esquemaCrearUsuario', () => {
  it('acepta una cédula de hasta 9 dígitos y un teléfono de hasta 11', () => {
    expect(esquemaCrearUsuario.safeParse({ ...BASE, telefono: '04125550134' }).success).toBe(true);
  });

  it('rechaza una cédula de 10 dígitos', () => {
    expect(esquemaCrearUsuario.safeParse({ ...BASE, cedula: '1234567890' }).success).toBe(false);
  });

  it('rechaza un teléfono de más de 11 dígitos o con separadores', () => {
    expect(esquemaCrearUsuario.safeParse({ ...BASE, telefono: '041255501345' }).success).toBe(
      false,
    );
    expect(esquemaCrearUsuario.safeParse({ ...BASE, telefono: '0412-555-0134' }).success).toBe(
      false,
    );
  });
});

describe('esquemaActualizarUsuario', () => {
  it('aplica la misma regla de teléfono y permite borrarlo', () => {
    expect(esquemaActualizarUsuario.safeParse({ telefono: '041255501345' }).success).toBe(false);
    expect(esquemaActualizarUsuario.safeParse({ telefono: null }).success).toBe(true);
  });
});
