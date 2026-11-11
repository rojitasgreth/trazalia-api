import type { ConfigService } from '@nestjs/config';

const sendMail = vi.fn();

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({ sendMail })),
}));

const { CorreoServicio } = await import('./correo.servicio.js');

const VALORES: Record<string, unknown> = {
  SMTP_HOST: 'localhost',
  SMTP_PUERTO: 1025,
  SMTP_USUARIO: undefined,
  SMTP_CONTRASENA: undefined,
  CORREO_REMITENTE: 'Trazalia <no-responder@trazalia.local>',
};

function crearConfig(): ConfigService<never, true> {
  return { get: (clave: string) => VALORES[clave] } as unknown as ConfigService<never, true>;
}

const DATOS = {
  para: 'ana@b.com',
  nombre: 'Ana',
  nombreAdmin: 'Luis Fisio',
  perfil: 'Fisioterapeuta',
  usuario: 'V123',
  correo: 'ana@b.com',
  enlaceActivacion: 'http://localhost:4200/activar-cuenta?token=abc',
  fechaVencimiento: '11 de noviembre de 2026, 2:00 p.m.',
};

describe('CorreoServicio', () => {
  beforeEach(() => {
    sendMail.mockReset();
  });

  it('envía la invitación con la plantilla interpolada', async () => {
    sendMail.mockResolvedValue(undefined);

    const servicio = new CorreoServicio(crearConfig());
    await servicio.enviarInvitacion(DATOS);

    expect(sendMail).toHaveBeenCalledOnce();
    const llamada = sendMail.mock.calls[0][0] as { to: string; html: string; from: string };
    expect(llamada.to).toBe('ana@b.com');
    expect(llamada.from).toBe('Trazalia <no-responder@trazalia.local>');
    expect(llamada.html).toContain('Ana');
    expect(llamada.html).toContain('Luis Fisio');
    expect(llamada.html).toContain('Fisioterapeuta');
    expect(llamada.html).toContain('http://localhost:4200/activar-cuenta?token=abc');
    // {{urlLogo}} vive dentro de un comentario HTML (instrucción para un logo
    // futuro) y se deja sin sustituir a propósito; solo verificamos que los
    // placeholders reales de los datos se resolvieron.
    expect(llamada.html).not.toContain('{{nombre}}');
    expect(llamada.html).not.toContain('{{enlaceActivacion}}');
  });

  it('nunca lanza si el envío falla (Documento Cero §16: no debe bloquear la creación)', async () => {
    sendMail.mockRejectedValue(new Error('SMTP caído'));

    const servicio = new CorreoServicio(crearConfig());

    await expect(servicio.enviarInvitacion(DATOS)).resolves.toBeUndefined();
  });
});
