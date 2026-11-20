import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validarContenido } from '../dominio/contenido.js';
import { fichaDe } from '../fichas/index.js';
import { ValoracionRepositorio } from '../repositorios/valoracion.repositorio.js';
import type { RespuestaValoracion } from '../vista/valoracion-vista.js';
import { ContextoValoracion } from './contexto-valoracion.js';

// SPEC C RF-C06, RF-C07, RF-C14 y §13: guardado parcial de una valoración En
// curso, sin campos obligatorios y sin sobrescribir cambios de otra pestaña.
@Injectable()
export class GuardarValoracionCasoUso {
  constructor(
    private readonly contexto: ContextoValoracion,
    private readonly valoraciones: ValoracionRepositorio,
  ) {}

  async ejecutar(
    idFisioterapeuta: string,
    idHistoria: string,
    comando: { contenido: Record<string, unknown>; version: number },
  ): Promise<RespuestaValoracion> {
    const { historia, valoracion } = await this.contexto.cargar(idFisioterapeuta, idHistoria);
    if (!valoracion) throw new NotFoundException();
    if (valoracion.estado === 'FINALIZADA') {
      throw new ConflictException({
        mensaje: 'La valoración está finalizada y ya no se puede editar.',
        motivo: 'finalizada',
      });
    }
    if (historia.archivada) {
      throw new ConflictException({ mensaje: 'La historia está archivada y es de solo lectura.' });
    }

    const { contenido, errores } = validarContenido(
      fichaDe(historia.tipo, valoracion.versionFicha),
      comando.contenido,
    );
    if (errores.length > 0) {
      throw new BadRequestException({ mensaje: 'El contenido no coincide con la ficha.', errores });
    }

    const guardada = await this.valoraciones.guardar(
      idFisioterapeuta,
      valoracion.idValoracion,
      comando.version,
      contenido,
    );
    if (!guardada) {
      throw new ConflictException({
        mensaje: 'La valoración cambió en otra pestaña. Recarga para ver la última versión.',
        motivo: 'version',
      });
    }
    return this.contexto.respuesta(historia, guardada);
  }
}
