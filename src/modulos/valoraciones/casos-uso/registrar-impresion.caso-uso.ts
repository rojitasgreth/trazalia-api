import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { ContextoValoracion } from './contexto-valoracion.js';

// SPEC C §11 y RF-C19: la impresión es del navegador (decisión del
// 19-11-2026); el backend solo registra que se imprimió una finalizada.
@Injectable()
export class RegistrarImpresionCasoUso {
  constructor(
    private readonly contexto: ContextoValoracion,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idFisioterapeuta: string, idHistoria: string): Promise<void> {
    const { valoracion } = await this.contexto.cargar(idFisioterapeuta, idHistoria);
    if (!valoracion) throw new NotFoundException();
    if (valoracion.estado !== 'FINALIZADA') {
      throw new ConflictException({ mensaje: 'Solo se imprime una valoración finalizada.' });
    }
    await this.auditoria.registrar({
      idUsuarioActor: idFisioterapeuta,
      tipoEvento: 'impresion_valoracion',
      resultado: 'EXITOSO',
      metadatosMinimos: { idHistoria, idValoracion: valoracion.idValoracion },
    });
  }
}
