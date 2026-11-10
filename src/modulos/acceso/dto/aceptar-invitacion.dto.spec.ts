import { esquemaAceptarInvitacion } from './aceptar-invitacion.dto.js';

describe('esquemaAceptarInvitacion', () => {
  it('acepta una contraseña válida (BR-011)', () => {
    expect(esquemaAceptarInvitacion.safeParse({ token: 't', contrasena: '12345678' }).success).toBe(
      true,
    );
  });

  it('acepta símbolos y caracteres Unicode', () => {
    expect(
      esquemaAceptarInvitacion.safeParse({ token: 't', contrasena: 'contraseña$€ñ123' }).success,
    ).toBe(true);
  });

  it('rechaza menos de 8 caracteres', () => {
    expect(esquemaAceptarInvitacion.safeParse({ token: 't', contrasena: '1234567' }).success).toBe(
      false,
    );
  });

  it('rechaza contraseñas con espacios', () => {
    expect(
      esquemaAceptarInvitacion.safeParse({ token: 't', contrasena: 'con espacio' }).success,
    ).toBe(false);
  });

  it('rechaza más de 128 caracteres', () => {
    expect(
      esquemaAceptarInvitacion.safeParse({ token: 't', contrasena: 'a'.repeat(129) }).success,
    ).toBe(false);
  });

  it('rechaza un token vacío', () => {
    expect(esquemaAceptarInvitacion.safeParse({ token: '', contrasena: '12345678' }).success).toBe(
      false,
    );
  });
});
