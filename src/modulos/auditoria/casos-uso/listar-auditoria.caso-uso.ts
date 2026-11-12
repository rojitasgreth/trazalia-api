import { Injectable } from '@nestjs/common';
import { AuditoriaRepositorio, type PaginaEventosAuditoria } from '../auditoria.repositorio.js';
import type { ListarAuditoriaDto } from '../dto/listar-auditoria.dto.js';

export interface PaginaEventosAuditoriaResultado extends PaginaEventosAuditoria {
  pagina: number;
  porPagina: number;
}

// BR-028/AC-027: solo Administradores (lo aplica el controlador); nunca
// expone secretos porque EventoAuditoria nunca los guarda.
@Injectable()
export class ListarAuditoriaCasoUso {
  constructor(private readonly repositorio: AuditoriaRepositorio) {}

  async ejecutar(filtros: ListarAuditoriaDto): Promise<PaginaEventosAuditoriaResultado> {
    const { datos, total } = await this.repositorio.listar({
      ...filtros,
      desde: filtros.desde ? new Date(filtros.desde) : undefined,
      hasta: filtros.hasta ? new Date(filtros.hasta) : undefined,
    });
    return { datos, total, pagina: filtros.pagina, porPagina: filtros.porPagina };
  }
}
