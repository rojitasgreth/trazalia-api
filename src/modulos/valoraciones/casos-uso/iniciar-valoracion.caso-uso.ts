import { ConflictException, Injectable } from '@nestjs/common';
import { esConflictoDeUnicidad } from '../../../compartido/prisma/errores.js';
import { UsuarioRepositorio } from '../../acceso/repositorios/usuario.repositorio.js';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { contenidoInicial } from '../dominio/contenido.js';
import { datosDeLaFicha } from '../dominio/datos-de-la-ficha.js';
import { fichaDe, VERSION_ACTUAL } from '../fichas/index.js';
import { ValoracionRepositorio } from '../repositorios/valoracion.repositorio.js';
import type { RespuestaValoracion } from '../vista/valoracion-vista.js';
import { ContextoValoracion } from './contexto-valoracion.js';

// SPEC C §6 pasos 1–2, RF-C01 a RF-C03: solo en Borrador con los datos
// personales completos; una sola por historia; fisioterapeuta y fecha/hora
// automáticos.
@Injectable()
export class IniciarValoracionCasoUso {
  constructor(
    private readonly contexto: ContextoValoracion,
    private readonly valoraciones: ValoracionRepositorio,
    private readonly usuarios: UsuarioRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(idFisioterapeuta: string, idHistoria: string): Promise<RespuestaValoracion> {
    const { historia, valoracion } = await this.contexto.cargar(idFisioterapeuta, idHistoria);
    if (valoracion) {
      throw new ConflictException({ mensaje: 'Esta historia ya tiene una valoración.' });
    }
    if (!historia.puedeIniciarValoracion) {
      throw new ConflictException({
        mensaje:
          'La valoración solo se inicia en una historia en Borrador con los datos personales completos.',
        camposFaltantes: historia.camposFaltantes,
      });
    }

    const versionFicha = VERSION_ACTUAL[historia.tipo];
    const nombres = await this.usuarios.buscarNombresPorIds([idFisioterapeuta]);
    let creada;
    try {
      creada = await this.valoraciones.crear({
        idHistoria,
        idFisioterapeuta,
        nombreFisioterapeuta: nombres.get(idFisioterapeuta) ?? '',
        tipo: historia.tipo,
        versionFicha,
        contenido: contenidoInicial(
          fichaDe(historia.tipo, versionFicha),
          datosDeLaFicha(historia, new Date()),
        ),
      });
    } catch (error) {
      // Otra solicitud la creó entre la consulta y el INSERT (SPEC C §16).
      if (esConflictoDeUnicidad(error)) {
        throw new ConflictException({ mensaje: 'Esta historia ya tiene una valoración.' });
      }
      throw error;
    }

    // RF-C19: sin datos clínicos en la auditoría.
    await this.auditoria.registrar({
      idUsuarioActor: idFisioterapeuta,
      tipoEvento: 'inicio_valoracion',
      resultado: 'EXITOSO',
      metadatosMinimos: { idHistoria, idValoracion: creada.idValoracion },
    });
    return this.contexto.respuesta(historia, creada);
  }
}
