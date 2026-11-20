import { Injectable } from '@nestjs/common';
import type { RespuestaValoracion } from '../vista/valoracion-vista.js';
import { ContextoValoracion } from './contexto-valoracion.js';

// SPEC C §6 y §11: la ficha, la valoración (si existe) y los datos personales
// que muestra. Sin valoración, devuelve la ficha vigente para su tipo.
@Injectable()
export class ObtenerValoracionCasoUso {
  constructor(private readonly contexto: ContextoValoracion) {}

  async ejecutar(idFisioterapeuta: string, idHistoria: string): Promise<RespuestaValoracion> {
    const { historia, valoracion } = await this.contexto.cargar(idFisioterapeuta, idHistoria);
    return this.contexto.respuesta(historia, valoracion);
  }
}
