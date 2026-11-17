import { Injectable } from '@nestjs/common';
import { CentroRepositorio } from './repositorios/centro.repositorio.js';
import { aCentroPublico, type CentroPublico } from './vista/centro-publico.js';

/**
 * Interfaz pública del módulo centros (Documento Cero §5): otros módulos
 * (historias) consultan centros por aquí, nunca su tabla.
 */
@Injectable()
export class CentrosServicio {
  constructor(private readonly centros: CentroRepositorio) {}

  /** Centros existentes entre los ids pedidos, indexados por id. */
  async obtener(ids: readonly string[]): Promise<Map<string, CentroPublico>> {
    const unicos = [...new Set(ids)];
    const centros = await this.centros.buscarPorIds(unicos);
    return new Map(centros.map((c) => [c.idCentro, aCentroPublico(c)]));
  }
}
