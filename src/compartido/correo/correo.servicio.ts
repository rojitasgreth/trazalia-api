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

function interpolar(plantilla: string, valores: Record<string, string>): string {
  return plantilla.replace(/{{\s*(\w+)\s*}}/g, (coincidencia, clave: string) =>
    clave in valores ? valores[clave] : coincidencia,
  );
}

// §16 (Disponibilidad): un fallo del correo nunca debe impedir que la cuenta
// PENDIENTE y su invitación se creen; el admin siempre puede reintentar con
// "reenviar invitación". Por eso este servicio nunca lanza: registra y sigue.
@Injectable()
export class CorreoServicio {
  private readonly logger = new Logger(CorreoServicio.name);
  private readonly transportador: Transporter;
  private readonly remitente: string;
  private plantillaInvitacion?: string;

  constructor(config: ConfigService<Entorno, true>) {
    this.remitente = config.get('CORREO_REMITENTE', { infer: true });
    this.transportador = createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PUERTO', { infer: true }),
      secure: false,
      auth: this.credenciales(config),
    });
  }

  private credenciales(
    config: ConfigService<Entorno, true>,
  ): { user: string; pass: string } | undefined {
    const usuario = config.get('SMTP_USUARIO', { infer: true });
    const contrasena = config.get('SMTP_CONTRASENA', { infer: true });
    return usuario && contrasena ? { user: usuario, pass: contrasena } : undefined;
  }

  async enviarInvitacion(datos: DatosInvitacion): Promise<void> {
    try {
      const html = interpolar(this.cargarPlantillaInvitacion(), { ...datos });
      await this.transportador.sendMail({
        from: this.remitente,
        to: datos.para,
        subject: 'Te invitaron a Trazalia: activa tu cuenta',
        html,
      });
    } catch (error) {
      this.logger.error(`No se pudo enviar el correo de invitación a "${datos.para}"`, error);
    }
  }

  private cargarPlantillaInvitacion(): string {
    this.plantillaInvitacion ??= readFileSync(
      join(import.meta.dirname, 'plantillas', 'invitacion.html'),
      'utf8',
    );
    return this.plantillaInvitacion;
  }
}
