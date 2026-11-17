import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  AutenticacionGuard,
  type UsuarioAutenticado,
} from '../acceso/guardias/autenticacion.guard.js';
import { CsrfGuard } from '../acceso/guardias/csrf.guard.js';
import { Roles } from '../acceso/guardias/roles.decorator.js';
import { RolesGuard } from '../acceso/guardias/roles.guard.js';
import { UsuarioActual } from '../acceso/guardias/usuario-actual.decorator.js';
import { BuscarCentrosCasoUso } from './casos-uso/buscar-centros.caso-uso.js';
import { CrearCentroCasoUso } from './casos-uso/crear-centro.caso-uso.js';
import { esquemaBuscarCentros, esquemaCrearCentro } from './dto/centros.dto.js';
import type { CentroPublico } from './vista/centro-publico.js';

// SPEC B v1.4 §8.7: catálogo compartido de centros médicos. Solo el
// Fisioterapeuta busca y registra; nadie edita ni elimina en esta fase.
@Controller('centros')
@UseGuards(AutenticacionGuard, RolesGuard)
@Roles('FISIOTERAPEUTA')
export class CentrosController {
  constructor(
    private readonly buscarCentros: BuscarCentrosCasoUso,
    private readonly crearCentro: CrearCentroCasoUso,
  ) {}

  @Get()
  async getBuscar(
    @Query({ schema: esquemaBuscarCentros }) query: z.infer<typeof esquemaBuscarCentros>,
  ): Promise<{ datos: CentroPublico[] }> {
    return { datos: await this.buscarCentros.ejecutar(query.texto) };
  }

  @Post()
  @UseGuards(CsrfGuard)
  async postCrear(
    @UsuarioActual() fisio: UsuarioAutenticado,
    @Body({ schema: esquemaCrearCentro }) cuerpo: z.infer<typeof esquemaCrearCentro>,
  ): Promise<{ centro: CentroPublico }> {
    return { centro: await this.crearCentro.ejecutar(fisio.idUsuario, cuerpo) };
  }
}
