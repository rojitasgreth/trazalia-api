import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { CentrosServicio } from '../../centros/centros.servicio.js';
import { centroDeHistoria } from '../dominio/centro-de-historia.js';
import { REGISTROS_CLINICOS, type RegistrosClinicos } from '../puertos/registros-clinicos.js';
import { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';
import { aHistoriaDetalle, type HistoriaDetalle } from '../vista/historia-vista.js';

// SPEC §11 / AC-014: una historia archivada puede desarchivarse y volver a
// estar disponible (y editable).
@Injectable()
export class DesarchivarHistoriaCasoUso {
  constructor(
    private readonly historias: HistoriaRepositorio,
    @Inject(REGISTROS_CLINICOS) private readonly registros: RegistrosClinicos,
    private readonly centros: CentrosServicio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idFisioterapeuta: string, idHistoria: string): Promise<HistoriaDetalle> {
    const historia = await this.historias.buscarPorId(idFisioterapeuta, idHistoria);
    if (!historia) {
      throw new NotFoundException();
    }
    if (!historia.archivada) {
      throw new ConflictException({ mensaje: 'La historia no está archivada.' });
    }

    const disponible = await this.historias.cambiarArchivo(idFisioterapeuta, idHistoria, false);
    await this.auditoria.registrar({
      idUsuarioActor: idFisioterapeuta,
      tipoEvento: 'desarchivo_historia',
      resultado: 'EXITOSO',
      metadatosMinimos: { idHistoria },
    });
    const [otras, tieneRegistros] = await Promise.all([
      this.historias.listarOtrasDelPaciente(idFisioterapeuta, disponible.idPaciente, idHistoria),
      this.registros.tieneRegistros(idFisioterapeuta, idHistoria),
    ]);
    return aHistoriaDetalle(
      disponible,
      otras,
      tieneRegistros,
      await centroDeHistoria(this.centros, disponible.idCentro),
    );
  }
}
