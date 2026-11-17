import { Injectable } from '@nestjs/common';
import type { ListarHistoriasDto } from '../dto/listar-historias.dto.js';
import { HistoriaRepositorio } from '../repositorios/historia.repositorio.js';
import { aHistoriaResumen, type HistoriaResumen } from '../vista/historia-vista.js';

export interface PaginaHistorias {
  datos: HistoriaResumen[];
  total: number;
  pagina: number;
  porPagina: number;
  /** Conteos de las pestañas Historias / Archivadas (sin filtros). */
  conteos: { historias: number; archivadas: number };
}

// SPEC §12 / RF-022, RF-023: listado, búsqueda y filtros dentro del ámbito
// del fisioterapeuta autenticado.
@Injectable()
export class ListarHistoriasCasoUso {
  constructor(private readonly historias: HistoriaRepositorio) {}

  async ejecutar(idFisioterapeuta: string, filtros: ListarHistoriasDto): Promise<PaginaHistorias> {
    const [{ datos, total }, conteos] = await Promise.all([
      this.historias.listar(idFisioterapeuta, {
        ...filtros,
        archivadas: filtros.archivadas === 'true',
      }),
      this.historias.contar(idFisioterapeuta),
    ]);
    return {
      datos: datos.map(aHistoriaResumen),
      total,
      pagina: filtros.pagina,
      porPagina: filtros.porPagina,
      conteos,
    };
  }
}
