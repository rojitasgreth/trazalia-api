import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';

// BR-018/BR-032/BR-033 / AC-030/AC-033: definitivo, sin reactivación posible.
@Injectable()
export class InactivarUsuarioCasoUso {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly sesiones: SesionRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idAdministrador: string, idUsuario: string): Promise<void> {
    if (idUsuario === idAdministrador) {
      throw new ForbiddenException('No puedes inactivar tu propia cuenta.');
    }

    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario) {
      throw new NotFoundException();
    }
    if (usuario.estado === 'INACTIVO') {
      throw new BadRequestException('La cuenta ya está inactiva de forma definitiva.');
    }

    const resultado = await this.usuarios.cambiarEstadoProtegido(idUsuario, 'INACTIVO');
    if (!resultado.ok) {
      throw new ForbiddenException(
        'El sistema debe conservar siempre al menos un administrador activo.',
      );
    }

    await this.sesiones.revocarTodasDeUsuario(idUsuario, 'inactivacion');
    await this.auditoria.registrar({
      idUsuarioActor: idAdministrador,
      idUsuarioAfectado: idUsuario,
      tipoEvento: 'inactivacion',
      resultado: 'EXITOSO',
    });
  }
}
