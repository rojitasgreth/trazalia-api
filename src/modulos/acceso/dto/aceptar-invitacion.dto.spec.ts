import { esquemaAceptarInvitacion } from './aceptar-invitacion.dto.js';

describe('esquemaAceptarInvitacion', () => {
  it('acepta un token y una contraseña válidos', () => {
    expect(esquemaAceptarInvitacion.safeParse({ token: 't', contrasena: '12345678' }).success).toBe(
      true,
    );
  });

  it('rechaza un token vacío', () => {
    expect(esquemaAceptarInvitacion.safeParse({ token: '', contrasena: '12345678' }).success).toBe(
      false,
    );
  });

  it('rechaza una contraseña inválida (regla centralizada en esquema-contrasena.ts)', () => {
    expect(esquemaAceptarInvitacion.safeParse({ token: 't', contrasena: '1234567' }).success).toBe(
      false,
    );
  });
});
