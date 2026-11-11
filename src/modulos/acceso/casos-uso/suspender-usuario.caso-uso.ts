import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';

// BR-017/BR-030/BR-033 / AC-024.
@Injectable()
export class SuspenderUsuarioCasoUso {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly sesiones: SesionRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idAdministrador: string, idUsuario: string): Promise<void> {
    if (idUsuario === idAdministrador) {
      throw new ForbiddenException('No puedes suspender tu propia cuenta.');
    }

    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario) {
      throw new NotFoundException();
    }
    if (usuario.estado !== 'ACTIVO') {
      throw new BadRequestException('Solo se puede suspender una cuenta activa.');
    }

    const resultado = await this.usuarios.cambiarEstadoProtegido(idUsuario, 'SUSPENDIDO');
    if (!resultado.ok) {
      throw new ForbiddenException(
        'El sistema debe conservar siempre al menos un administrador activo.',
      );
    }

    await this.sesiones.revocarTodasDeUsuario(idUsuario, 'suspension');
    await this.auditoria.registrar({
      idUsuarioActor: idAdministrador,
      idUsuarioAfectado: idUsuario,
      tipoEvento: 'suspension',
      resultado: 'EXITOSO',
    });
  }
}
