import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';

// Spec §13 POST /usuarios/{id}/desbloquear: levanta un BLOQUEADO antes de su
// plazo. No revoca sesiones: el bloqueo es por intentos fallidos, no implica
// que existan sesiones activas comprometidas.
@Injectable()
export class DesbloquearUsuarioCasoUso {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idAdministrador: string, idUsuario: string): Promise<void> {
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario) {
      throw new NotFoundException();
    }
    if (usuario.estado !== 'BLOQUEADO') {
      throw new BadRequestException('La cuenta no está bloqueada.');
    }

    await this.usuarios.desbloquear(idUsuario);
    await this.auditoria.registrar({
      idUsuarioActor: idAdministrador,
      idUsuarioAfectado: idUsuario,
      tipoEvento: 'desbloqueo',
      resultado: 'EXITOSO',
      metadatosMinimos: { actor: 'administrador' },
    });
  }
}
