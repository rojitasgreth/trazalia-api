import { Injectable } from '@nestjs/common';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';

// BR-036: única señal que cuenta como actividad humana además de "Continuar"
// en el aviso de inactividad. El llamador (controlador) la limita a una vez
// cada 2 minutos del lado cliente; el servidor solo la aplica.
@Injectable()
export class RegistrarActividadCasoUso {
  constructor(private readonly sesiones: SesionRepositorio) {}

  async ejecutar(idSesion: string): Promise<void> {
    await this.sesiones.registrarActividad(idSesion);
  }
}
