import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';

// Spec §13: reactiva una cuenta SUSPENDIDA que ya fue activada; no aplica a
// INACTIVO ni a una SUSPENDIDA que nunca se activó (para esa, "reenviar
// invitación" es la acción correcta — AC-032).
@Injectable()
export class ReactivarUsuarioCasoUso {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idAdministrador: string, idUsuario: string): Promise<void> {
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario) {
      throw new NotFoundException();
    }
    if (usuario.estado !== 'SUSPENDIDO' || !usuario.fechaActivacion) {
      throw new BadRequestException(
        'Solo se puede reactivar una cuenta suspendida que ya había sido activada. Si nunca se activó, usa "reenviar invitación".',
      );
    }

    await this.usuarios.actualizarEstado(idUsuario, 'ACTIVO');
    await this.auditoria.registrar({
      idUsuarioActor: idAdministrador,
      idUsuarioAfectado: idUsuario,
      tipoEvento: 'reactivacion',
      resultado: 'EXITOSO',
    });
  }
}
