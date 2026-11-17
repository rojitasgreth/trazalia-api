import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { REGISTROS_CLINICOS, type RegistrosClinicos } from '../puertos/registros-clinicos.js';
import { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';

// SPEC §13.2–§13.3 / RF-019–RF-021 / AC-014–AC-015.
@Injectable()
export class EliminarHistoriaCasoUso {
  constructor(
    private readonly historias: HistoriaRepositorio,
    @Inject(REGISTROS_CLINICOS) private readonly registros: RegistrosClinicos,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idFisioterapeuta: string, idHistoria: string): Promise<void> {
    const historia = await this.historias.buscarPorId(idFisioterapeuta, idHistoria);
    if (!historia) {
      throw new NotFoundException();
    }
    // RF-019: con registros clínicos no se elimina; la alternativa es archivar.
    if (historia.archivada || (await this.registros.tieneRegistros(idFisioterapeuta, idHistoria))) {
      throw new ConflictException({
        mensaje: 'Esta historia tiene registros clínicos asociados y no se puede eliminar.',
        motivo: 'registros_clinicos',
      });
    }

    // RF-021: solo el identificador, quién y cuándo (fecha del evento); nunca
    // una copia de los datos eliminados. Si no puede auditarse, no se borra.
    await this.historias.eliminar(idFisioterapeuta, historia, (tx) =>
      this.auditoria.registrarEnTransaccion(tx, {
        idUsuarioActor: idFisioterapeuta,
        tipoEvento: 'eliminacion_historia',
        resultado: 'EXITOSO',
        metadatosMinimos: { idHistoria },
      }),
    );
  }
}
