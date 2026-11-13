import { Injectable } from '@nestjs/common';
import type { EventoAuditoria } from '../../../generado/prisma/client.js';
import { UsuarioRepositorio } from '../../acceso/repositorios/usuario.repositorio.js';
import { AuditoriaRepositorio } from '../auditoria.repositorio.js';
import type { ListarAuditoriaDto } from '../dto/listar-auditoria.dto.js';

export interface EventoAuditoriaConNombres extends EventoAuditoria {
  nombreActor: string | null;
  nombreAfectado: string | null;
}

export interface PaginaEventosAuditoriaResultado {
  datos: EventoAuditoriaConNombres[];
  total: number;
  pagina: number;
  porPagina: number;
}

// BR-028/AC-027: solo Administradores (lo aplica el controlador); nunca
// expone secretos porque EventoAuditoria nunca los guarda. Los nombres se
// resuelven al consultar (nombre actual), no se guardan en el evento: el id,
// que es lo inmutable, sigue siendo la única referencia persistida.
//
// Este caso de uso vive físicamente en auditoria/ pero se registra en
// AccesoModule (como AuditoriaController) para poder inyectar
// UsuarioRepositorio sin crear un ciclo de módulos.
@Injectable()
export class ListarAuditoriaCasoUso {
  constructor(
    private readonly repositorio: AuditoriaRepositorio,
    private readonly usuarios: UsuarioRepositorio,
  ) {}

  async ejecutar(filtros: ListarAuditoriaDto): Promise<PaginaEventosAuditoriaResultado> {
    const { datos, total } = await this.repositorio.listar({
      ...filtros,
      desde: filtros.desde ? new Date(filtros.desde) : undefined,
      hasta: filtros.hasta ? new Date(filtros.hasta) : undefined,
    });

    const ids = [...new Set(datos.flatMap((e) => [e.idUsuarioActor, e.idUsuarioAfectado]))].filter(
      (id): id is string => id !== null,
    );
    const nombres = await this.usuarios.buscarNombresPorIds(ids);

    const datosConNombres = datos.map((evento) => ({
      ...evento,
      nombreActor: evento.idUsuarioActor ? (nombres.get(evento.idUsuarioActor) ?? null) : null,
      nombreAfectado: evento.idUsuarioAfectado
        ? (nombres.get(evento.idUsuarioAfectado) ?? null)
        : null,
    }));

    return { datos: datosConNombres, total, pagina: filtros.pagina, porPagina: filtros.porPagina };
  }
}
