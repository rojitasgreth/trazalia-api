import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { esConflictoDeUnicidad } from '../../../compartido/prisma/errores.js';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { DatosPersonales } from '../dominio/datos-personales.js';
import { validarIdentificacion, validarRepresentante } from '../dominio/identificacion.js';
import { normalizarDatosPersonales, normalizarRepresentante } from '../dominio/normalizar.js';
import { camposCambiados, cambiosParaOtraHistoria } from '../dominio/propagacion.js';
import { REGISTROS_CLINICOS, type RegistrosClinicos } from '../puertos/registros-clinicos.js';
import type { ActualizarHistoriaDto } from '../dto/actualizar-historia.dto.js';
import {
  HistoriaRepositorio,
  type HistoriaConRepresentante,
  type Propagacion,
} from '../repositorios/historia.repositorio.js';
import {
  aDatosPersonales,
  aHistoriaDetalle,
  type HistoriaDetalle,
} from '../vista/historia-vista.js';
import { BuscarCoincidenciasCasoUso } from './buscar-coincidencias.caso-uso.js';

// SPEC §13.1 (RF-018), §10.2 (RF-014, AC-010) y §11: edición de datos
// personales por el propietario, con propagación opcional y atómica.
@Injectable()
export class ActualizarHistoriaCasoUso {
  constructor(
    private readonly historias: HistoriaRepositorio,
    private readonly coincidencias: BuscarCoincidenciasCasoUso,
    private readonly auditoria: AuditoriaServicio,
    @Inject(REGISTROS_CLINICOS) private readonly registros: RegistrosClinicos,
  ) {}

  async ejecutar(
    idFisioterapeuta: string,
    idHistoria: string,
    comando: ActualizarHistoriaDto,
  ): Promise<HistoriaDetalle> {
    const actual = await this.historias.buscarPorId(idFisioterapeuta, idHistoria);
    if (!actual) {
      throw new NotFoundException();
    }
    if (actual.archivada) {
      throw new ConflictException({
        mensaje: 'La historia está archivada y es de solo lectura. Desarchívala para editarla.',
      });
    }

    const datos = normalizarDatosPersonales(actual.tipo, comando);
    const representante = normalizarRepresentante(actual.tipo, comando.representante);
    const errores = [
      ...validarIdentificacion(actual.tipo, datos),
      ...validarRepresentante(representante),
    ];
    if (errores.length > 0) {
      throw new BadRequestException({ mensaje: 'Faltan datos obligatorios.', errores });
    }

    const antes = aDatosPersonales(actual);
    await this.rechazarDocumentoAjeno(idFisioterapeuta, actual, antes, datos);

    const cambiados = camposCambiados(antes, datos);
    const propagaciones = comando.propagar
      ? await this.propagaciones(idFisioterapeuta, actual, cambiados, datos)
      : [];

    let historia: HistoriaConRepresentante;
    try {
      historia = await this.historias.actualizar(
        idFisioterapeuta,
        idHistoria,
        datos,
        representante,
        propagaciones,
      );
    } catch (error) {
      if (esConflictoDeUnicidad(error)) {
        throw new ConflictException({
          mensaje: 'Ya existe otra historia de este tipo con ese documento.',
        });
      }
      throw error;
    }

    // Se auditan los nombres de los campos, nunca sus valores (Documento Cero §14).
    await this.auditoria.registrar({
      idUsuarioActor: idFisioterapeuta,
      tipoEvento: 'actualizacion_historia',
      resultado: 'EXITOSO',
      metadatosMinimos: {
        idHistoria,
        campos: cambiados,
        historiasPropagadas: propagaciones.map((p) => p.idHistoria),
      },
    });

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

  /**
   * Si el documento cambia y coincide con historias de OTRO paciente del mismo
   * fisioterapeuta, se rechaza: unir pacientes no forma parte de esta fase.
   */
  private async rechazarDocumentoAjeno(
    idFisioterapeuta: string,
    actual: HistoriaConRepresentante,
    antes: DatosPersonales,
    despues: DatosPersonales,
  ): Promise<void> {
    const mismoDocumento =
      antes.nacionalidad === despues.nacionalidad &&
      antes.cedula === despues.cedula &&
      antes.sinDocumento === despues.sinDocumento;
    if (mismoDocumento) return;
    const coincidencias = await this.coincidencias.buscar(idFisioterapeuta, despues);
    if (coincidencias.some((h) => h.idPaciente !== actual.idPaciente)) {
      throw new ConflictException({
        mensaje:
          'Ese documento ya pertenece a otro paciente en tus historias. Revisa el número antes de guardar.',
      });
    }
  }

  /** ADR-0002: solo historias no archivadas del mismo paciente; las archivadas no se tocan. */
  private async propagaciones(
    idFisioterapeuta: string,
    actual: HistoriaConRepresentante,
    cambiados: Parameters<typeof cambiosParaOtraHistoria>[0],
    datos: DatosPersonales,
  ): Promise<Propagacion[]> {
    if (cambiados.length === 0) return [];
    const otras = await this.historias.listarOtrasDelPaciente(
      idFisioterapeuta,
      actual.idPaciente,
      actual.idHistoria,
    );
    return otras
      .filter((otra) => !otra.archivada)
      .map((otra) => ({
        idHistoria: otra.idHistoria,
        cambios: cambiosParaOtraHistoria(cambiados, datos, otra),
      }))
      .filter((p) => Object.keys(p.cambios).length > 0);
  }
}
