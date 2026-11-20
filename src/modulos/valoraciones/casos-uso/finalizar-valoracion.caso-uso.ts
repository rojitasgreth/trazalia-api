import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { MarcarHistoriaActivaCasoUso } from '../../historias/casos-uso/marcar-historia-activa.caso-uso.js';
import { datosDeLaFicha } from '../dominio/datos-de-la-ficha.js';
import { ValoracionRepositorio } from '../repositorios/valoracion.repositorio.js';
import type { RespuestaValoracion } from '../vista/valoracion-vista.js';
import { ContextoValoracion } from './contexto-valoracion.js';

// SPEC C §6 pasos 5–6, RF-C13: la valoración pasa a Finalizada (con la foto de
// los datos personales) y la historia a Activa en la misma transacción.
@Injectable()
export class FinalizarValoracionCasoUso {
  constructor(
    private readonly contexto: ContextoValoracion,
    private readonly valoraciones: ValoracionRepositorio,
    private readonly marcarActiva: MarcarHistoriaActivaCasoUso,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(
    idFisioterapeuta: string,
    idHistoria: string,
    version: number,
  ): Promise<RespuestaValoracion> {
    const { historia, valoracion } = await this.contexto.cargar(idFisioterapeuta, idHistoria);
    if (!valoracion) throw new NotFoundException();
    if (valoracion.estado === 'FINALIZADA') {
      throw new ConflictException({
        mensaje: 'La valoración ya está finalizada.',
        motivo: 'finalizada',
      });
    }
    if (historia.archivada) {
      throw new ConflictException({ mensaje: 'La historia está archivada y es de solo lectura.' });
    }

    const ahora = new Date();
    const finalizada = await this.valoraciones.finalizar(
      idFisioterapeuta,
      valoracion.idValoracion,
      version,
      datosDeLaFicha(historia, ahora),
      async (tx) => {
        await this.marcarActiva.ejecutarEnTransaccion(tx, idFisioterapeuta, idHistoria);
        await this.auditoria.registrarEnTransaccion(tx, {
          idUsuarioActor: idFisioterapeuta,
          tipoEvento: 'finalizacion_valoracion',
          resultado: 'EXITOSO',
          metadatosMinimos: { idHistoria, idValoracion: valoracion.idValoracion },
        });
      },
    );
    if (!finalizada) {
      throw new ConflictException({
        mensaje: 'La valoración cambió en otra pestaña. Recarga para ver la última versión.',
        motivo: 'version',
      });
    }
    return this.contexto.respuesta({ ...historia, estado: 'ACTIVA' }, finalizada, ahora);
  }
}
