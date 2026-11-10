import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';

// AC-023: una sesión concreta se revoca sin afectar a las demás del usuario.
@Injectable()
export class CerrarSesionCasoUso {
  constructor(
    private readonly sesiones: SesionRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idUsuario: string, idSesion: string, idSesionObjetivo?: string): Promise<void> {
    const objetivo = idSesionObjetivo ?? idSesion;
    if (objetivo !== idSesion) {
      const sesion = await this.sesiones.buscarPorId(objetivo);
      if (!sesion || sesion.idUsuario !== idUsuario) {
        throw new ForbiddenException();
      }
    }

    await this.sesiones.revocar(objetivo, 'logout_manual');
    await this.auditoria.registrar({
      idUsuarioActor: idUsuario,
      tipoEvento: 'cierre_sesion',
      resultado: 'EXITOSO',
      metadatosMinimos: { idSesion: objetivo },
    });
  }
}
