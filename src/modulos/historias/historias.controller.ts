import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  AutenticacionGuard,
  type UsuarioAutenticado,
} from '../acceso/guardias/autenticacion.guard.js';
import { CsrfGuard } from '../acceso/guardias/csrf.guard.js';
import { Roles } from '../acceso/guardias/roles.decorator.js';
import { RolesGuard } from '../acceso/guardias/roles.guard.js';
import { UsuarioActual } from '../acceso/guardias/usuario-actual.decorator.js';
import {
  BuscarCoincidenciasCasoUso,
  type ResultadoCoincidencia,
} from './casos-uso/buscar-coincidencias.caso-uso.js';
import { CrearHistoriaCasoUso } from './casos-uso/crear-historia.caso-uso.js';
import {
  ListarHistoriasCasoUso,
  type PaginaHistorias,
} from './casos-uso/listar-historias.caso-uso.js';
import { ObtenerHistoriaCasoUso } from './casos-uso/obtener-historia.caso-uso.js';
import { esquemaBuscarCoincidencias } from './dto/buscar-coincidencias.dto.js';
import { esquemaCrearHistoria } from './dto/crear-historia.dto.js';
import { esquemaListarHistorias } from './dto/listar-historias.dto.js';
import type { HistoriaDetalle } from './vista/historia-vista.js';

// RF-001/AC-001: solo el Fisioterapeuta; el Administrador no tiene acceso
// clínico ni por URL ni por API. El propietario sale siempre de la sesión.
@Controller('historias')
@UseGuards(AutenticacionGuard, RolesGuard)
@Roles('FISIOTERAPEUTA')
export class HistoriasController {
  constructor(
    private readonly crearHistoria: CrearHistoriaCasoUso,
    private readonly listarHistorias: ListarHistoriasCasoUso,
    private readonly obtenerHistoria: ObtenerHistoriaCasoUso,
    private readonly buscarCoincidencias: BuscarCoincidenciasCasoUso,
  ) {}

  @Get()
  async getListar(
    @UsuarioActual() fisio: UsuarioAutenticado,
    @Query({ schema: esquemaListarHistorias }) query: z.infer<typeof esquemaListarHistorias>,
  ): Promise<PaginaHistorias> {
    return this.listarHistorias.ejecutar(fisio.idUsuario, query);
  }

  @Post()
  @UseGuards(CsrfGuard)
  async postCrear(
    @UsuarioActual() fisio: UsuarioAutenticado,
    @Body({ schema: esquemaCrearHistoria }) cuerpo: z.infer<typeof esquemaCrearHistoria>,
  ): Promise<{ historia: HistoriaDetalle }> {
    const historia = await this.crearHistoria.ejecutar(fisio.idUsuario, cuerpo);
    return { historia };
  }

  // B13/B14: antes de guardar, ¿duplicado del mismo tipo u otra historia del
  // mismo paciente para autocompletar? (RF-010, RF-012)
  @Post('coincidencias')
  @UseGuards(CsrfGuard)
  @HttpCode(200)
  async postCoincidencias(
    @UsuarioActual() fisio: UsuarioAutenticado,
    @Body({ schema: esquemaBuscarCoincidencias })
    cuerpo: z.infer<typeof esquemaBuscarCoincidencias>,
  ): Promise<ResultadoCoincidencia> {
    return this.buscarCoincidencias.ejecutar(fisio.idUsuario, cuerpo);
  }

  @Get(':id')
  async getDetalle(
    @UsuarioActual() fisio: UsuarioAutenticado,
    @Param('id', { schema: z.string().uuid() }) id: string,
  ): Promise<{ historia: HistoriaDetalle }> {
    const historia = await this.obtenerHistoria.ejecutar(fisio.idUsuario, id);
    return { historia };
  }
}
