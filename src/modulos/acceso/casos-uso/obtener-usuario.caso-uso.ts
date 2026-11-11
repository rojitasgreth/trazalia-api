import { Injectable, NotFoundException } from '@nestjs/common';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { aUsuarioAdministrado, type UsuarioAdministrado } from '../vista/usuario-administrado.js';

@Injectable()
export class ObtenerUsuarioCasoUso {
  constructor(private readonly usuarios: UsuarioRepositorio) {}

  async ejecutar(idUsuario: string): Promise<UsuarioAdministrado> {
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario) {
      throw new NotFoundException();
    }
    return aUsuarioAdministrado(usuario);
  }
}
