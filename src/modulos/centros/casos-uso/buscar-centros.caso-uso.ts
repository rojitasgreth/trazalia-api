import { Injectable } from '@nestjs/common';
import { normalizarTexto } from '../dominio/normalizar.js';
import { CentroRepositorio } from '../repositorios/centro.repositorio.js';
import { aCentroPublico, type CentroPublico } from '../vista/centro-publico.js';

const LIMITE = 10;

// SPEC B v1.4 §8.7 (B29): búsqueda mientras se escribe en el catálogo
// compartido. Primero los que empiezan por el texto, luego el resto.
@Injectable()
export class BuscarCentrosCasoUso {
  constructor(private readonly centros: CentroRepositorio) {}

  async ejecutar(texto: string): Promise<CentroPublico[]> {
    const termino = normalizarTexto(texto);
    const encontrados = await this.centros.buscarPorNombre(termino, LIMITE * 2);
    return encontrados
      .sort(
        (a, b) =>
          Number(!a.nombreNormalizado.startsWith(termino)) -
            Number(!b.nombreNormalizado.startsWith(termino)) ||
          a.nombreNormalizado.localeCompare(b.nombreNormalizado),
      )
      .slice(0, LIMITE)
      .map(aCentroPublico);
  }
}
