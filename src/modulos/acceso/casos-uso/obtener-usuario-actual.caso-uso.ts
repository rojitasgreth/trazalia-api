import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { aUsuarioPublico, type UsuarioPublico } from '../vista/usuario-publico.js';

// Permite al frontend restaurar la sesión al recargar la página: el access
// token es HttpOnly y no es legible por JavaScript (spec §9.1).
@Injectable()
export class ObtenerUsuarioActualCasoUso {
  constructor(private readonly usuarios: UsuarioRepositorio) {}

  async ejecutar(idUsuario: string): Promise<UsuarioPublico> {
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario) {
      throw new UnauthorizedException();
    }
    return aUsuarioPublico(usuario);
  }
}
