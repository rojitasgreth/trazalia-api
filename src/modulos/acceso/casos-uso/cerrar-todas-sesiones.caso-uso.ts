import { Injectable } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';

@Injectable()
export class CerrarTodasSesionesCasoUso {
  constructor(
    private readonly sesiones: SesionRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idUsuario: string): Promise<void> {
    await this.sesiones.revocarTodasDeUsuario(idUsuario, 'logout_todas');
    await this.auditoria.registrar({
      idUsuarioActor: idUsuario,
      tipoEvento: 'cierre_todas_sesiones',
      resultado: 'EXITOSO',
    });
  }
}
