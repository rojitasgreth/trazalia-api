import { Injectable, NotFoundException } from '@nestjs/common';
import { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';
import { aHistoriaDetalle, type HistoriaDetalle } from '../vista/historia-vista.js';

// SPEC §19 (detalle) y AC-013: una historia ajena responde igual que una
// inexistente (404), para no revelar que existe.
@Injectable()
export class ObtenerHistoriaCasoUso {
  constructor(private readonly historias: HistoriaRepositorio) {}

  async ejecutar(idFisioterapeuta: string, idHistoria: string): Promise<HistoriaDetalle> {
    const historia = await this.historias.buscarPorId(idFisioterapeuta, idHistoria);
    if (!historia) {
      throw new NotFoundException();
    }
    const otras = await this.historias.listarOtrasDelPaciente(
      idFisioterapeuta,
      historia.idPaciente,
      historia.idHistoria,
    );
    return aHistoriaDetalle(historia, otras);
  }
}
