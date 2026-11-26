import type { ConfigService } from '@nestjs/config';

const sendMail = vi.fn();

vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({ sendMail })),
}));

const { CorreoServicio, separarRemitente } = await import('./correo.servicio.js');

const VALORES: Record<string, unknown> = {
  SMTP_HOST: 'localhost',
  SMTP_PUERTO: 1025,
  SMTP_USUARIO: undefined,
  SMTP_CONTRASENA: undefined,
  CORREO_REMITENTE: 'Trazalia <no-responder@trazalia.local>',
  BREVO_API_KEY: undefined,
};

function crearConfig(extra: Record<string, unknown> = {}): ConfigService<never, true> {
  const valores = { ...VALORES, ...extra };
  return { get: (clave: string) => valores[clave] } as unknown as ConfigService<never, true>;
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

  it('envía la recuperación con el enlace y la fecha de vencimiento (BR-013)', async () => {
    sendMail.mockResolvedValue(undefined);

    const servicio = new CorreoServicio(crearConfig());
    await servicio.enviarRecuperacion({
      para: 'ana@b.com',
      nombre: 'Ana',
      usuario: 'V123',
      enlaceRestablecimiento: 'http://localhost:4200/restablecer-contrasena?token=abc',
      fechaVencimiento: '11 de noviembre de 2026, 2:15 p.m.',
    });

    expect(sendMail).toHaveBeenCalledOnce();
    const llamada = sendMail.mock.calls[0][0] as { to: string; html: string; subject: string };
    expect(llamada.to).toBe('ana@b.com');
    expect(llamada.subject).toBe('Restablece tu contraseña de Trazalia');
    expect(llamada.html).toContain('http://localhost:4200/restablecer-contrasena?token=abc');
    expect(llamada.html).not.toContain('{{enlaceRestablecimiento}}');
  });

  it('envía la notificación de cambio de contraseña (BR-014)', async () => {
    sendMail.mockResolvedValue(undefined);

    const servicio = new CorreoServicio(crearConfig());
    await servicio.enviarContrasenaCambiada({ para: 'ana@b.com', nombre: 'Ana', usuario: 'V123' });

    expect(sendMail).toHaveBeenCalledOnce();
    const llamada = sendMail.mock.calls[0][0] as { subject: string; html: string };
    expect(llamada.subject).toBe('Tu contraseña de Trazalia cambió');
    expect(llamada.html).toContain('V123');
  });

  describe('con BREVO_API_KEY (calidad en Render, sin SMTP)', () => {
    const fetchFalso = vi.fn();

    beforeEach(() => {
      fetchFalso.mockReset();
      vi.stubGlobal('fetch', fetchFalso);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const config = () =>
      crearConfig({ BREVO_API_KEY: 'xkeysib-prueba', CORREO_REMITENTE: 'Trazalia <yo@gmail.com>' });

    it('envía por la API HTTPS de Brevo y no usa SMTP', async () => {
      fetchFalso.mockResolvedValue(new Response('{"messageId":"1"}', { status: 201 }));

      await new CorreoServicio(config()).enviarInvitacion(DATOS);

      expect(sendMail).not.toHaveBeenCalled();
      expect(fetchFalso).toHaveBeenCalledOnce();
      const [url, opciones] = fetchFalso.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.brevo.com/v3/smtp/email');
      expect(opciones.method).toBe('POST');
      expect((opciones.headers as Record<string, string>)['api-key']).toBe('xkeysib-prueba');
      const cuerpo = JSON.parse(opciones.body as string) as {
        sender: unknown;
        to: unknown;
        subject: string;
        htmlContent: string;
      };
      expect(cuerpo.sender).toEqual({ name: 'Trazalia', email: 'yo@gmail.com' });
      expect(cuerpo.to).toEqual([{ email: 'ana@b.com' }]);
      expect(cuerpo.subject).toBe('Te invitaron a Trazalia: activa tu cuenta');
      expect(cuerpo.htmlContent).toContain('http://localhost:4200/activar-cuenta?token=abc');
    });

    it('nunca lanza si Brevo rechaza el envío', async () => {
      fetchFalso.mockResolvedValue(new Response('{"code":"unauthorized"}', { status: 401 }));

      await expect(new CorreoServicio(config()).enviarInvitacion(DATOS)).resolves.toBeUndefined();
    });

    it('nunca lanza si la red falla', async () => {
      fetchFalso.mockRejectedValue(new TypeError('fetch failed'));

      await expect(new CorreoServicio(config()).enviarInvitacion(DATOS)).resolves.toBeUndefined();
    });
  });
});

describe('separarRemitente', () => {
  it('separa nombre y correo', () => {
    expect(separarRemitente('Trazalia <yo@gmail.com>')).toEqual({
      name: 'Trazalia',
      email: 'yo@gmail.com',
    });
  });

  it('acepta solo el correo', () => {
    expect(separarRemitente('yo@gmail.com')).toEqual({ email: 'yo@gmail.com' });
    expect(separarRemitente('<yo@gmail.com>')).toEqual({ email: 'yo@gmail.com' });
  });
});
