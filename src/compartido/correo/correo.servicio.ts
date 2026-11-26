import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Entorno } from '../../configuracion/entorno.js';

export interface DatosInvitacion {
  para: string;
  nombre: string;
  nombreAdmin: string;
  perfil: string;
  usuario: string;
  correo: string;
  enlaceActivacion: string;
  fechaVencimiento: string;
}

export interface DatosRecuperacion {
  para: string;
  nombre: string;
  usuario: string;
  enlaceRestablecimiento: string;
  fechaVencimiento: string;
}

export interface DatosContrasenaCambiada {
  para: string;
  nombre: string;
  usuario: string;
}

interface Mensaje {
  para: string;
  subject: string;
  html: string;
}

const URL_API_BREVO = 'https://api.brevo.com/v3/smtp/email';
const ESPERA_API_MS = 10_000;

function interpolar(plantilla: string, valores: Record<string, string>): string {
  return plantilla.replace(/{{\s*(\w+)\s*}}/g, (coincidencia, clave: string) =>
    clave in valores ? valores[clave] : coincidencia,
  );
}

/** "Trazalia <a@b.com>" → { name: 'Trazalia', email: 'a@b.com' }; sin "<>", solo email. */
export function separarRemitente(remitente: string): { name?: string; email: string } {
  const partes = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(remitente);
  if (!partes) return { email: remitente.trim() };
  return partes[1] ? { name: partes[1], email: partes[2] } : { email: partes[2] };
}

// §16 (Disponibilidad): un fallo del correo nunca debe impedir que la cuenta
// PENDIENTE y su invitación se creen; el admin siempre puede reintentar con
// "reenviar invitación". Por eso este servicio nunca lanza: registra y sigue.
@Injectable()
export class CorreoServicio {
  private readonly logger = new Logger(CorreoServicio.name);
  private readonly remitente: string;
  private readonly entregar: (mensaje: Mensaje) => Promise<void>;
  private readonly plantillas = new Map<string, string>();

  constructor(config: ConfigService<Entorno, true>) {
    this.remitente = config.get('CORREO_REMITENTE', { infer: true });
    // Render gratis bloquea la salida a los puertos SMTP: en calidad el correo
    // va por la API HTTPS de Brevo. Sin clave, SMTP (Mailpit en desarrollo).
    const claveBrevo = config.get('BREVO_API_KEY', { infer: true });
    this.entregar = claveBrevo
      ? (mensaje) => this.entregarPorBrevo(claveBrevo, mensaje)
      : this.entregarPorSmtp(config);
  }

  private entregarPorSmtp(
    config: ConfigService<Entorno, true>,
  ): (mensaje: Mensaje) => Promise<void> {
    const transportador: Transporter = createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PUERTO', { infer: true }),
      secure: false,
      // Fuera de desarrollo (Mailpit) el envío exige STARTTLS (puerto 587).
      requireTLS: config.get('NODE_ENV', { infer: true }) === 'production',
      auth: this.credenciales(config),
    });
    return async ({ para, subject, html }) => {
      await transportador.sendMail({ from: this.remitente, to: para, subject, html });
    };
  }

  private async entregarPorBrevo(clave: string, { para, subject, html }: Mensaje): Promise<void> {
    const respuesta = await fetch(URL_API_BREVO, {
      method: 'POST',
      headers: { 'api-key': clave, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: separarRemitente(this.remitente),
        to: [{ email: para }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(ESPERA_API_MS),
    });
    if (!respuesta.ok) {
      throw new Error(`Brevo respondió ${respuesta.status}: ${await respuesta.text()}`);
    }
  }

  private credenciales(
    config: ConfigService<Entorno, true>,
  ): { user: string; pass: string } | undefined {
    const usuario = config.get('SMTP_USUARIO', { infer: true });
    const contrasena = config.get('SMTP_CONTRASENA', { infer: true });
    return usuario && contrasena ? { user: usuario, pass: contrasena } : undefined;
  }

  async enviarInvitacion(datos: DatosInvitacion): Promise<void> {
    await this.enviar(datos.para, 'Te invitaron a Trazalia: activa tu cuenta', 'invitacion.html', {
      ...datos,
    });
  }

  /** BR-013: enlace de recuperación, DP-04: vence en 15 minutos. */
  async enviarRecuperacion(datos: DatosRecuperacion): Promise<void> {
    await this.enviar(datos.para, 'Restablece tu contraseña de Trazalia', 'recuperacion.html', {
      ...datos,
    });
  }

  /** BR-014: notificación best-effort tras un cambio de contraseña exitoso. */
  async enviarContrasenaCambiada(datos: DatosContrasenaCambiada): Promise<void> {
    await this.enviar(datos.para, 'Tu contraseña de Trazalia cambió', 'contrasena-cambiada.html', {
      ...datos,
    });
  }

  private async enviar(
    para: string,
    subject: string,
    archivoPlantilla: string,
    valores: Record<string, string>,
  ): Promise<void> {
    try {
      const html = interpolar(this.cargarPlantilla(archivoPlantilla), valores);
      await this.entregar({ para, subject, html });
    } catch (error) {
      this.logger.error(`No se pudo enviar el correo "${subject}" a "${para}"`, error);
    }
  }

  private cargarPlantilla(archivo: string): string {
    let plantilla = this.plantillas.get(archivo);
    if (!plantilla) {
      plantilla = readFileSync(join(import.meta.dirname, 'plantillas', archivo), 'utf8');
      this.plantillas.set(archivo, plantilla);
    }
    return plantilla;
  }
}
