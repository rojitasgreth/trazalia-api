import { esquemaIniciarSesion } from './iniciar-sesion.dto.js';

describe('esquemaIniciarSesion', () => {
  it('acepta identificador y contraseña no vacíos', () => {
    const resultado = esquemaIniciarSesion.safeParse({ identificador: 'a@b.com', contrasena: 'x' });
    expect(resultado.success).toBe(true);
  });

  it('rechaza identificador vacío', () => {
    expect(esquemaIniciarSesion.safeParse({ identificador: '', contrasena: 'x' }).success).toBe(
      false,
    );
  });

  it('rechaza contraseña vacía', () => {
    expect(esquemaIniciarSesion.safeParse({ identificador: 'a', contrasena: '' }).success).toBe(
      false,
    );
  });
});
