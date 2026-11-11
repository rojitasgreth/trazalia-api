import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AutenticacionGuard } from '../acceso/guardias/autenticacion.guard.js';
import { Roles } from '../acceso/guardias/roles.decorator.js';
import { RolesGuard } from '../acceso/guardias/roles.guard.js';
import {
  ListarAuditoriaCasoUso,
  type PaginaEventosAuditoriaResultado,
} from './casos-uso/listar-auditoria.caso-uso.js';
import { esquemaListarAuditoria } from './dto/listar-auditoria.dto.js';

// BR-028/AC-026/AC-027: solo Administradores consultan la bitácora.
@Controller('auditoria')
@UseGuards(AutenticacionGuard, RolesGuard)
@Roles('ADMINISTRADOR')
export class AuditoriaController {
  constructor(private readonly listarAuditoria: ListarAuditoriaCasoUso) {}

  @Get('eventos')
  async getEventos(
    @Query({ schema: esquemaListarAuditoria }) query: z.infer<typeof esquemaListarAuditoria>,
  ): Promise<PaginaEventosAuditoriaResultado> {
    return this.listarAuditoria.ejecutar(query);
  }
}
