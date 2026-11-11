import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Entorno } from '../../../configuracion/entorno.js';
import { CorreoServicio } from '../../../compartido/correo/correo.servicio.js';
import { generarTokenAleatorio, resumir } from '../../../compartido/seguridad/resumen.js';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { formatearFechaVencimiento } from '../dominio/invitacion-correo.js';
import { RecuperacionRepositorio } from '../repositorios/recuperacion.repositorio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';

const VIDA_RECUPERACION_MS = 15 * 60 * 1000; // DP-04: 15 minutos, no configurable.
const ESTADOS_QUE_PUEDEN_RECUPERAR = new Set(['ACTIVO', 'BLOQUEADO']);

// BR-013/flujo 7.5/AC-012: la respuesta es siempre la misma genérica, exista
// o no la cuenta y pueda o no recuperarse; por eso este caso de uso no
// lanza ni devuelve nada que permita distinguir los casos desde fuera.
@Injectable()
export class SolicitarRecuperacionCasoUso {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly recuperaciones: RecuperacionRepositorio,
    private readonly correo: CorreoServicio,
    private readonly auditoria: AuditoriaServicio,
    private readonly config: ConfigService<Entorno, true>,
  ) {}

  async ejecutar(correo: string): Promise<void> {
    const usuario = await this.usuarios.buscarPorIdentificador(correo);
    if (!usuario || !ESTADOS_QUE_PUEDEN_RECUPERAR.has(usuario.estado)) {
      return;
    }

    await this.recuperaciones.invalidarVigentesDeUsuario(usuario.idUsuario);

    const token = generarTokenAleatorio();
    const fechaExpiracion = new Date(Date.now() + VIDA_RECUPERACION_MS);
    await this.recuperaciones.crear(usuario.idUsuario, resumir(token), fechaExpiracion);

    await this.auditoria.registrar({
      idUsuarioActor: usuario.idUsuario,
      tipoEvento: 'solicitud_recuperacion',
      resultado: 'EXITOSO',
    });

    const origenWeb = this.config.get('ORIGEN_WEB', { infer: true });
    await this.correo.enviarRecuperacion({
      para: usuario.correo,
      nombre: usuario.nombre,
      usuario: usuario.nombreUsuario,
      enlaceRestablecimiento: `${origenWeb}/restablecer-contrasena?token=${encodeURIComponent(token)}`,
      fechaVencimiento: formatearFechaVencimiento(
        fechaExpiracion,
        this.config.get('ZONA_HORARIA_NEGOCIO', { infer: true }),
      ),
    });
  }
}
