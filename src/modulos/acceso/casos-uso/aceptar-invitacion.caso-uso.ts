import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { hashearContrasena } from '../../../compartido/seguridad/contrasena.js';
import { resumir } from '../../../compartido/seguridad/resumen.js';
import { InvitacionRepositorio } from '../repositorios/invitacion.repositorio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';

export interface AceptarInvitacionComando {
  token: string;
  contrasena: string;
}

// Flujo 7.1 (consumo) / BR-007, BR-008, BR-031 / AC-005, AC-006, AC-007.
@Injectable()
export class AceptarInvitacionCasoUso {
  constructor(
    private readonly invitaciones: InvitacionRepositorio,
    private readonly usuarios: UsuarioRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(comando: AceptarInvitacionComando): Promise<void> {
    const invitacion = await this.invitaciones.buscarPorResumenToken(resumir(comando.token));

    if (!invitacion || invitacion.fechaConsumo) {
      throw new BadRequestException('La invitación no existe o ya fue utilizada.');
    }

    if (invitacion.fechaExpiracion < new Date()) {
      // BR-031: también se comprueba al abrir el enlace vencido.
      await this.usuarios.actualizarEstado(invitacion.idUsuario, 'SUSPENDIDO');
      await this.auditoria.registrar({
        idUsuarioAfectado: invitacion.idUsuario,
        tipoEvento: 'invitacion_vencida',
        resultado: 'SUSPENDIDO',
        metadatosMinimos: { idInvitacion: invitacion.idInvitacion },
      });
      throw new BadRequestException('La invitación venció. Solicita una nueva al administrador.');
    }

    const hash = await hashearContrasena(comando.contrasena);
    await this.usuarios.activarConContrasena(invitacion.idUsuario, hash);
    await this.invitaciones.marcarConsumida(invitacion.idInvitacion);

    await this.auditoria.registrar({
      idUsuarioActor: invitacion.idUsuario,
      idUsuarioAfectado: invitacion.idUsuario,
      tipoEvento: 'activacion_cuenta',
      resultado: 'EXITOSO',
      metadatosMinimos: { idInvitacion: invitacion.idInvitacion },
    });
  }
}
