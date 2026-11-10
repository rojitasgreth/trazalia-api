import { Injectable } from '@nestjs/common';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';

export interface SesionPublica {
  idSesion: string;
  etiquetaDispositivo: string | null;
  fechaCreacion: Date;
  ultimaActividad: Date;
}

// AC-023: expone las sesiones simultáneas del usuario para que pueda
// revocarlas individualmente, nunca el jti ni su resumen.
@Injectable()
export class ListarSesionesCasoUso {
  constructor(private readonly sesiones: SesionRepositorio) {}

  async ejecutar(idUsuario: string): Promise<SesionPublica[]> {
    const sesiones = await this.sesiones.listarActivasDeUsuario(idUsuario);
    return sesiones.map((sesion) => ({
      idSesion: sesion.idSesion,
      etiquetaDispositivo: sesion.etiquetaDispositivo,
      fechaCreacion: sesion.fechaCreacion,
      ultimaActividad: sesion.ultimaActividad,
    }));
  }
}
