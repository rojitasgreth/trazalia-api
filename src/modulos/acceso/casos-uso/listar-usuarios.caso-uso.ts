import { Injectable } from '@nestjs/common';
import type { EstadoCuenta, RolUsuario } from '../../../generado/prisma/enums.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { aUsuarioAdministrado, type UsuarioAdministrado } from '../vista/usuario-administrado.js';

export interface ListarUsuariosComando {
  texto?: string;
  rol?: RolUsuario;
  estado?: EstadoCuenta;
  pagina: number;
  porPagina: number;
}

export interface PaginaUsuariosAdministrados {
  datos: UsuarioAdministrado[];
  total: number;
  pagina: number;
  porPagina: number;
}

@Injectable()
export class ListarUsuariosCasoUso {
  constructor(private readonly usuarios: UsuarioRepositorio) {}

  async ejecutar(comando: ListarUsuariosComando): Promise<PaginaUsuariosAdministrados> {
    const { datos, total } = await this.usuarios.listar(comando);
    return {
      datos: datos.map(aUsuarioAdministrado),
      total,
      pagina: comando.pagina,
      porPagina: comando.porPagina,
    };
  }
}
