import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Entorno } from '../../../configuracion/entorno.js';
import { CorreoServicio } from '../../../compartido/correo/correo.servicio.js';
import { generarTokenAleatorio, resumir } from '../../../compartido/seguridad/resumen.js';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import {
  construirEnlaceActivacion,
  formatearFechaVencimiento,
  perfilLegible,
} from '../dominio/invitacion-correo.js';
import { InvitacionRepositorio } from '../repositorios/invitacion.repositorio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';

const VIDA_INVITACION_MS = 24 * 60 * 60 * 1000;

// BR-031/AC-032: reenvía sobre una cuenta PENDIENTE (vigente o no) o una
// SUSPENDIDA que nunca se activó (vuelve a PENDIENTE); siempre invalida la
// invitación anterior.
@Injectable()
export class ReenviarInvitacionCasoUso {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly invitaciones: InvitacionRepositorio,
    private readonly correo: CorreoServicio,
    private readonly auditoria: AuditoriaServicio,
    private readonly config: ConfigService<Entorno, true>,
  ) {}

  async ejecutar(idAdministrador: string, idUsuario: string): Promise<void> {
    const administrador = await this.usuarios.buscarPorId(idAdministrador);
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!administrador || !usuario) {
      throw new NotFoundException();
    }

    const suspendidaNuncaActivada = usuario.estado === 'SUSPENDIDO' && !usuario.fechaActivacion;
    if (usuario.estado !== 'PENDIENTE' && !suspendidaNuncaActivada) {
      throw new BadRequestException(
        'Solo se puede reenviar la invitación de una cuenta pendiente o suspendida que nunca se activó.',
      );
    }

    const vigente = await this.invitaciones.buscarVigentePorUsuario(idUsuario);
    if (vigente) {
      await this.invitaciones.invalidar(vigente.idInvitacion);
    }

    if (suspendidaNuncaActivada) {
      await this.usuarios.actualizarEstado(idUsuario, 'PENDIENTE');
    }

    const token = generarTokenAleatorio();
    const fechaExpiracion = new Date(Date.now() + VIDA_INVITACION_MS);
    await this.invitaciones.crear(idUsuario, resumir(token), fechaExpiracion, idAdministrador);

    await this.auditoria.registrar({
      idUsuarioActor: idAdministrador,
      idUsuarioAfectado: idUsuario,
      tipoEvento: 'reenvio_invitacion',
      resultado: 'EXITOSO',
    });

    await this.correo.enviarInvitacion({
      para: usuario.correo,
      nombre: usuario.nombre,
      nombreAdmin: `${administrador.nombre} ${administrador.apellido}`,
      perfil: perfilLegible(usuario.rol),
      usuario: usuario.nombreUsuario,
      correo: usuario.correo,
      enlaceActivacion: construirEnlaceActivacion(
        this.config.get('ORIGEN_WEB', { infer: true }),
        token,
      ),
      fechaVencimiento: formatearFechaVencimiento(
        fechaExpiracion,
        this.config.get('ZONA_HORARIA_NEGOCIO', { infer: true }),
      ),
    });
  }
}
