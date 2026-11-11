import { Injectable, NotFoundException } from '@nestjs/common';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import type { SesionPublica } from './listar-sesiones.caso-uso.js';

@Injectable()
export class ListarSesionesDeUsuarioCasoUso {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly sesiones: SesionRepositorio,
  ) {}

  async ejecutar(idUsuario: string): Promise<SesionPublica[]> {
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario) {
      throw new NotFoundException();
    }
    const sesiones = await this.sesiones.listarActivasDeUsuario(idUsuario);
    return sesiones.map((sesion) => ({
      idSesion: sesion.idSesion,
      etiquetaDispositivo: sesion.etiquetaDispositivo,
      fechaCreacion: sesion.fechaCreacion,
      ultimaActividad: sesion.ultimaActividad,
    }));
  }
}
