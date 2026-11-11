import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';

// Spec §13: POST /usuarios/{id}/sesiones/{idSesion}/cerrar — revoca una
// sesión concreta de OTRO usuario (distinto de autenticacion/cerrar-sesion,
// que solo actúa sobre la sesión propia).
@Injectable()
export class AdminCerrarSesionCasoUso {
  constructor(
    private readonly sesiones: SesionRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idAdministrador: string, idUsuario: string, idSesion: string): Promise<void> {
    const sesion = await this.sesiones.buscarPorId(idSesion);
    if (!sesion || sesion.idUsuario !== idUsuario) {
      throw new ForbiddenException();
    }

    await this.sesiones.revocar(idSesion, 'cierre_administrativo');
    await this.auditoria.registrar({
      idUsuarioActor: idAdministrador,
      idUsuarioAfectado: idUsuario,
      tipoEvento: 'cierre_sesion_administrativo',
      resultado: 'EXITOSO',
      metadatosMinimos: { idSesion },
    });
  }
}
