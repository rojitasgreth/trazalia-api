import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { CentrosServicio } from '../../centros/centros.servicio.js';
import { centroDeHistoria } from '../dominio/centro-de-historia.js';
import { REGISTROS_CLINICOS, type RegistrosClinicos } from '../puertos/registros-clinicos.js';
import { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';
import { aHistoriaDetalle, type HistoriaDetalle } from '../vista/historia-vista.js';

// SPEC §11 y §13.2 / RF-019 / AC-014: archivar es la alternativa a eliminar
// una historia con registros clínicos; queda de solo lectura.
@Injectable()
export class ArchivarHistoriaCasoUso {
  constructor(
    private readonly historias: HistoriaRepositorio,
    @Inject(REGISTROS_CLINICOS) private readonly registros: RegistrosClinicos,
    private readonly auditoria: AuditoriaServicio,
    private readonly centros: CentrosServicio,
  ) {}

  async ejecutar(idFisioterapeuta: string, idHistoria: string): Promise<HistoriaDetalle> {
    const historia = await this.historias.buscarPorId(idFisioterapeuta, idHistoria);
    if (!historia) {
      throw new NotFoundException();
    }
    if (historia.archivada) {
      throw new ConflictException({ mensaje: 'La historia ya está archivada.' });
    }
    if (!(await this.registros.tieneRegistros(idFisioterapeuta, idHistoria))) {
      throw new ConflictException({
        mensaje: 'Solo se archivan historias con registros clínicos. Esta puede eliminarse.',
      });
    }

    const archivada = await this.historias.cambiarArchivo(idFisioterapeuta, idHistoria, true);
    await this.auditoria.registrar({
      idUsuarioActor: idFisioterapeuta,
      tipoEvento: 'archivo_historia',
      resultado: 'EXITOSO',
      metadatosMinimos: { idHistoria },
    });
    const otras = await this.historias.listarOtrasDelPaciente(
      idFisioterapeuta,
      archivada.idPaciente,
      idHistoria,
    );
    return aHistoriaDetalle(
      archivada,
      otras,
      true,
      await centroDeHistoria(this.centros, archivada.idCentro),
    );
  }
}
