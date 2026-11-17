import { ConflictException, Injectable } from '@nestjs/common';
import { esConflictoDeUnicidad } from '../../../compartido/prisma/errores.js';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { limpiarTexto, normalizarTexto } from '../dominio/normalizar.js';
import type { CrearCentroDto } from '../dto/centros.dto.js';
import { CentroRepositorio, type NuevoCentro } from '../repositorios/centro.repositorio.js';
import { aCentroPublico, type CentroPublico } from '../vista/centro-publico.js';

// SPEC B v1.4 §8.7 (B31) / ADR-0004: cualquier fisioterapeuta registra un
// centro en el catálogo compartido, solo si no existe ya (mismo nombre,
// estado y municipio, sin importar mayúsculas ni tildes).
@Injectable()
export class CrearCentroCasoUso {
  constructor(
    private readonly centros: CentroRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idFisioterapeuta: string, comando: CrearCentroDto): Promise<CentroPublico> {
    const nuevo: NuevoCentro = {
      nombre: limpiarTexto(comando.nombre),
      nombreNormalizado: normalizarTexto(comando.nombre),
      dirEstado: comando.dirEstado,
      dirMunicipio: limpiarTexto(comando.dirMunicipio),
      municipioNormalizado: normalizarTexto(comando.dirMunicipio),
      dirParroquia: limpiarTexto(comando.dirParroquia),
      dirComunidad: comando.dirComunidad?.trim() ? limpiarTexto(comando.dirComunidad) : null,
      idFisioterapeutaCreador: idFisioterapeuta,
    };

    await this.rechazarSiExiste(nuevo);
    let centro;
    try {
      centro = await this.centros.crear(nuevo);
    } catch (error) {
      // Otro fisioterapeuta lo registró entre la búsqueda y el INSERT.
      if (esConflictoDeUnicidad(error)) {
        await this.rechazarSiExiste(nuevo);
      }
      throw error;
    }

    await this.auditoria.registrar({
      idUsuarioActor: idFisioterapeuta,
      tipoEvento: 'creacion_centro',
      resultado: 'EXITOSO',
      metadatosMinimos: { idCentro: centro.idCentro },
    });
    return aCentroPublico(centro);
  }

  /** 409 con el centro existente, para que la interfaz ofrezca usarlo. */
  private async rechazarSiExiste(nuevo: NuevoCentro): Promise<void> {
    const existente = await this.centros.buscarDuplicado(
      nuevo.nombreNormalizado,
      nuevo.dirEstado,
      nuevo.municipioNormalizado,
    );
    if (existente) {
      throw new ConflictException({
        mensaje: 'Este centro ya está registrado.',
        centro: aCentroPublico(existente),
      });
    }
  }
}
