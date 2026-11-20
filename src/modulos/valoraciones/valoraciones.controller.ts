import { Body, Controller, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  AutenticacionGuard,
  type UsuarioAutenticado,
} from '../acceso/guardias/autenticacion.guard.js';
import { CsrfGuard } from '../acceso/guardias/csrf.guard.js';
import { Roles } from '../acceso/guardias/roles.decorator.js';
import { RolesGuard } from '../acceso/guardias/roles.guard.js';
import { UsuarioActual } from '../acceso/guardias/usuario-actual.decorator.js';
import { FinalizarValoracionCasoUso } from './casos-uso/finalizar-valoracion.caso-uso.js';
import { GuardarValoracionCasoUso } from './casos-uso/guardar-valoracion.caso-uso.js';
import { IniciarValoracionCasoUso } from './casos-uso/iniciar-valoracion.caso-uso.js';
import { ObtenerValoracionCasoUso } from './casos-uso/obtener-valoracion.caso-uso.js';
import { RegistrarImpresionCasoUso } from './casos-uso/registrar-impresion.caso-uso.js';
import { esquemaFinalizarValoracion, esquemaGuardarValoracion } from './dto/valoracion.dto.js';
import type { RespuestaValoracion } from './vista/valoracion-vista.js';

const idHistoria = { schema: z.string().uuid() };

// SPEC C §4: solo el fisioterapeuta propietario de la historia; el
// Administrador no tiene acceso clínico (403 por rol).
@Controller('historias/:idHistoria/valoracion')
@UseGuards(AutenticacionGuard, RolesGuard)
@Roles('FISIOTERAPEUTA')
export class ValoracionesController {
  constructor(
    private readonly obtener: ObtenerValoracionCasoUso,
    private readonly iniciar: IniciarValoracionCasoUso,
    private readonly guardar: GuardarValoracionCasoUso,
    private readonly finalizar: FinalizarValoracionCasoUso,
    private readonly registrarImpresion: RegistrarImpresionCasoUso,
  ) {}

  @Get()
  getValoracion(
    @UsuarioActual() fisio: UsuarioAutenticado,
    @Param('idHistoria', idHistoria) id: string,
  ): Promise<RespuestaValoracion> {
    return this.obtener.ejecutar(fisio.idUsuario, id);
  }

  @Post()
  @UseGuards(CsrfGuard)
  postIniciar(
    @UsuarioActual() fisio: UsuarioAutenticado,
    @Param('idHistoria', idHistoria) id: string,
  ): Promise<RespuestaValoracion> {
    return this.iniciar.ejecutar(fisio.idUsuario, id);
  }

  @Put()
  @UseGuards(CsrfGuard)
  putGuardar(
    @UsuarioActual() fisio: UsuarioAutenticado,
    @Param('idHistoria', idHistoria) id: string,
    @Body({ schema: esquemaGuardarValoracion }) cuerpo: z.infer<typeof esquemaGuardarValoracion>,
  ): Promise<RespuestaValoracion> {
    return this.guardar.ejecutar(fisio.idUsuario, id, cuerpo);
  }

  @Post('finalizar')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  postFinalizar(
    @UsuarioActual() fisio: UsuarioAutenticado,
    @Param('idHistoria', idHistoria) id: string,
    @Body({ schema: esquemaFinalizarValoracion })
    cuerpo: z.infer<typeof esquemaFinalizarValoracion>,
  ): Promise<RespuestaValoracion> {
    return this.finalizar.ejecutar(fisio.idUsuario, id, cuerpo.version);
  }

  @Post('impresion')
  @HttpCode(204)
  @UseGuards(CsrfGuard)
  async postImpresion(
    @UsuarioActual() fisio: UsuarioAutenticado,
    @Param('idHistoria', idHistoria) id: string,
  ): Promise<void> {
    await this.registrarImpresion.ejecutar(fisio.idUsuario, id);
  }
}
