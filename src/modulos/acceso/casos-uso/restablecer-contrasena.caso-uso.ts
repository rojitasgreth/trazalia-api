import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { CorreoServicio } from '../../../compartido/correo/correo.servicio.js';
import { hashearContrasena } from '../../../compartido/seguridad/contrasena.js';
import { resumir } from '../../../compartido/seguridad/resumen.js';
import { RecuperacionRepositorio } from '../repositorios/recuperacion.repositorio.js';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';

export interface RestablecerContrasenaComando {
  token: string;
  contrasena: string;
}

// Flujo 7.5 / BR-013, BR-014 / AC-013.
@Injectable()
export class RestablecerContrasenaCasoUso {
  constructor(
    private readonly recuperaciones: RecuperacionRepositorio,
    private readonly usuarios: UsuarioRepositorio,
    private readonly sesiones: SesionRepositorio,
    private readonly correo: CorreoServicio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(comando: RestablecerContrasenaComando): Promise<void> {
    const recuperacion = await this.recuperaciones.buscarPorResumenToken(resumir(comando.token));

    if (!recuperacion || recuperacion.fechaConsumo) {
      throw new BadRequestException('El enlace no existe o ya fue utilizado.');
    }
    if (recuperacion.fechaExpiracion < new Date()) {
      throw new BadRequestException('El enlace venció. Solicita uno nuevo.');
    }

    const hash = await hashearContrasena(comando.contrasena);
    // BR-013/014: también levanta un posible BLOQUEADO (ver UsuarioRepositorio.actualizarContrasena).
    const usuario = await this.usuarios.actualizarContrasena(recuperacion.idUsuario, hash);
    await this.recuperaciones.marcarConsumida(recuperacion.idRecuperacion);
    await this.sesiones.revocarTodasDeUsuario(usuario.idUsuario, 'cambio_contrasena');

    await this.auditoria.registrar({
      idUsuarioActor: usuario.idUsuario,
      idUsuarioAfectado: usuario.idUsuario,
      tipoEvento: 'cambio_contrasena',
      resultado: 'EXITOSO',
      metadatosMinimos: { idRecuperacion: recuperacion.idRecuperacion, sesionesRevocadas: true },
    });

    await this.correo.enviarContrasenaCambiada({
      para: usuario.correo,
      nombre: usuario.nombre,
      usuario: usuario.nombreUsuario,
    });
  }
}
