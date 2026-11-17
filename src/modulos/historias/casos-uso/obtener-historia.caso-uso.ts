import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REGISTROS_CLINICOS, type RegistrosClinicos } from '../puertos/registros-clinicos.js';
import { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';
import { aHistoriaDetalle, type HistoriaDetalle } from '../vista/historia-vista.js';

// SPEC §19 (detalle) y AC-013: una historia ajena responde igual que una
// inexistente (404), para no revelar que existe.
@Injectable()
export class ObtenerHistoriaCasoUso {
  constructor(
    private readonly historias: HistoriaRepositorio,
    @Inject(REGISTROS_CLINICOS) private readonly registros: RegistrosClinicos,
  ) {}

  async ejecutar(idFisioterapeuta: string, idHistoria: string): Promise<HistoriaDetalle> {
    const historia = await this.historias.buscarPorId(idFisioterapeuta, idHistoria);
    if (!historia) {
      throw new NotFoundException();
    }
    const [otras, tieneRegistros] = await Promise.all([
      this.historias.listarOtrasDelPaciente(
        idFisioterapeuta,
        historia.idPaciente,
        historia.idHistoria,
      ),
      this.registros.tieneRegistros(idFisioterapeuta, idHistoria),
    ]);
    return aHistoriaDetalle(historia, otras, tieneRegistros);
  }
}
