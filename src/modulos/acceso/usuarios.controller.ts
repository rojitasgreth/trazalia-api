import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ActualizarUsuarioCasoUso } from './casos-uso/actualizar-usuario.caso-uso.js';
import { AdminCerrarSesionCasoUso } from './casos-uso/admin-cerrar-sesion.caso-uso.js';
import { CrearUsuarioCasoUso } from './casos-uso/crear-usuario.caso-uso.js';
import { InactivarUsuarioCasoUso } from './casos-uso/inactivar-usuario.caso-uso.js';
import { ListarSesionesDeUsuarioCasoUso } from './casos-uso/listar-sesiones-de-usuario.caso-uso.js';
import {
  ListarUsuariosCasoUso,
  type PaginaUsuariosAdministrados,
} from './casos-uso/listar-usuarios.caso-uso.js';
import { ObtenerUsuarioCasoUso } from './casos-uso/obtener-usuario.caso-uso.js';
import { ReactivarUsuarioCasoUso } from './casos-uso/reactivar-usuario.caso-uso.js';
import { ReenviarInvitacionCasoUso } from './casos-uso/reenviar-invitacion.caso-uso.js';
import type { SesionPublica } from './casos-uso/listar-sesiones.caso-uso.js';
import { SuspenderUsuarioCasoUso } from './casos-uso/suspender-usuario.caso-uso.js';
import { esquemaActualizarUsuario } from './dto/actualizar-usuario.dto.js';
import { esquemaCrearUsuario } from './dto/crear-usuario.dto.js';
import { esquemaListarUsuarios } from './dto/listar-usuarios.dto.js';
import { AutenticacionGuard, type UsuarioAutenticado } from './guardias/autenticacion.guard.js';
import { CsrfGuard } from './guardias/csrf.guard.js';
import { Roles } from './guardias/roles.decorator.js';
import { RolesGuard } from './guardias/roles.guard.js';
import { UsuarioActual } from './guardias/usuario-actual.decorator.js';
import type { UsuarioAdministrado } from './vista/usuario-administrado.js';
import type { UsuarioPublico } from './vista/usuario-publico.js';

@Controller('usuarios')
@UseGuards(AutenticacionGuard, RolesGuard)
@Roles('ADMINISTRADOR')
export class UsuariosController {
  constructor(
    private readonly crearUsuario: CrearUsuarioCasoUso,
    private readonly listarUsuarios: ListarUsuariosCasoUso,
    private readonly obtenerUsuario: ObtenerUsuarioCasoUso,
    private readonly actualizarUsuario: ActualizarUsuarioCasoUso,
    private readonly suspenderUsuario: SuspenderUsuarioCasoUso,
    private readonly reactivarUsuario: ReactivarUsuarioCasoUso,
    private readonly inactivarUsuario: InactivarUsuarioCasoUso,
    private readonly reenviarInvitacion: ReenviarInvitacionCasoUso,
    private readonly listarSesionesDeUsuario: ListarSesionesDeUsuarioCasoUso,
    private readonly adminCerrarSesion: AdminCerrarSesionCasoUso,
  ) {}

  @Post()
  @UseGuards(CsrfGuard)
  async postCrear(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Body({ schema: esquemaCrearUsuario }) cuerpo: z.infer<typeof esquemaCrearUsuario>,
  ): Promise<{ usuario: UsuarioPublico }> {
    const usuario = await this.crearUsuario.ejecutar(admin.idUsuario, cuerpo);
    return { usuario };
  }

  @Get()
  async getListar(
    @Query({ schema: esquemaListarUsuarios }) query: z.infer<typeof esquemaListarUsuarios>,
  ): Promise<PaginaUsuariosAdministrados> {
    return this.listarUsuarios.ejecutar(query);
  }

  @Get(':id')
  async getDetalle(
    @Param('id', { schema: z.string().uuid() }) id: string,
  ): Promise<{ usuario: UsuarioAdministrado }> {
    const usuario = await this.obtenerUsuario.ejecutar(id);
    return { usuario };
  }

  @Patch(':id')
  @UseGuards(CsrfGuard)
  async patchActualizar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', { schema: z.string().uuid() }) id: string,
    @Body({ schema: esquemaActualizarUsuario }) cuerpo: z.infer<typeof esquemaActualizarUsuario>,
  ): Promise<{ usuario: UsuarioAdministrado }> {
    const usuario = await this.actualizarUsuario.ejecutar(admin.idUsuario, id, cuerpo);
    return { usuario };
  }

  @Post(':id/suspender')
  @UseGuards(CsrfGuard)
  async postSuspender(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', { schema: z.string().uuid() }) id: string,
  ): Promise<{ estado: 'ok' }> {
    await this.suspenderUsuario.ejecutar(admin.idUsuario, id);
    return { estado: 'ok' };
  }

  @Post(':id/reactivar')
  @UseGuards(CsrfGuard)
  async postReactivar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', { schema: z.string().uuid() }) id: string,
  ): Promise<{ estado: 'ok' }> {
    await this.reactivarUsuario.ejecutar(admin.idUsuario, id);
    return { estado: 'ok' };
  }

  @Post(':id/inactivar')
  @UseGuards(CsrfGuard)
  async postInactivar(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', { schema: z.string().uuid() }) id: string,
  ): Promise<{ estado: 'ok' }> {
    await this.inactivarUsuario.ejecutar(admin.idUsuario, id);
    return { estado: 'ok' };
  }

  @Post(':id/reenviar-invitacion')
  @UseGuards(CsrfGuard)
  async postReenviarInvitacion(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', { schema: z.string().uuid() }) id: string,
  ): Promise<{ estado: 'ok' }> {
    await this.reenviarInvitacion.ejecutar(admin.idUsuario, id);
    return { estado: 'ok' };
  }

  @Get(':id/sesiones')
  async getSesiones(
    @Param('id', { schema: z.string().uuid() }) id: string,
  ): Promise<{ data: SesionPublica[] }> {
    const data = await this.listarSesionesDeUsuario.ejecutar(id);
    return { data };
  }

  @Post(':id/sesiones/:idSesion/cerrar')
  @UseGuards(CsrfGuard)
  async postCerrarSesion(
    @UsuarioActual() admin: UsuarioAutenticado,
    @Param('id', { schema: z.string().uuid() }) id: string,
    @Param('idSesion', { schema: z.string().uuid() }) idSesion: string,
  ): Promise<{ estado: 'ok' }> {
    await this.adminCerrarSesion.ejecutar(admin.idUsuario, id, idSesion);
    return { estado: 'ok' };
  }
}
