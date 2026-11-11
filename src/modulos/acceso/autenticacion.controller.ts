import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { z } from 'zod';
import { AceptarInvitacionCasoUso } from './casos-uso/aceptar-invitacion.caso-uso.js';
import { CerrarSesionCasoUso } from './casos-uso/cerrar-sesion.caso-uso.js';
import { CerrarTodasSesionesCasoUso } from './casos-uso/cerrar-todas-sesiones.caso-uso.js';
import { IniciarSesionCasoUso } from './casos-uso/iniciar-sesion.caso-uso.js';
import { ListarSesionesCasoUso, type SesionPublica } from './casos-uso/listar-sesiones.caso-uso.js';
import { ObtenerUsuarioActualCasoUso } from './casos-uso/obtener-usuario-actual.caso-uso.js';
import { RegistrarActividadCasoUso } from './casos-uso/registrar-actividad.caso-uso.js';
import { RenovarSesionCasoUso } from './casos-uso/renovar-sesion.caso-uso.js';
import { RestablecerContrasenaCasoUso } from './casos-uso/restablecer-contrasena.caso-uso.js';
import { SolicitarRecuperacionCasoUso } from './casos-uso/solicitar-recuperacion.caso-uso.js';
import { esquemaAceptarInvitacion } from './dto/aceptar-invitacion.dto.js';
import { esquemaIniciarSesion } from './dto/iniciar-sesion.dto.js';
import { esquemaRestablecerContrasena } from './dto/restablecer-contrasena.dto.js';
import { esquemaSolicitarRecuperacion } from './dto/solicitar-recuperacion.dto.js';
import { AutenticacionGuard, type UsuarioAutenticado } from './guardias/autenticacion.guard.js';
import { CsrfGuard } from './guardias/csrf.guard.js';
import { UsuarioActual } from './guardias/usuario-actual.decorator.js';
import { COOKIE_RENOVACION, CookiesServicio } from './jwt/cookies.servicio.js';
import type { UsuarioPublico } from './vista/usuario-publico.js';

@Controller('autenticacion')
export class AutenticacionController {
  constructor(
    private readonly iniciarSesion: IniciarSesionCasoUso,
    private readonly renovarSesion: RenovarSesionCasoUso,
    private readonly cerrarSesion: CerrarSesionCasoUso,
    private readonly cerrarTodasSesiones: CerrarTodasSesionesCasoUso,
    private readonly registrarActividad: RegistrarActividadCasoUso,
    private readonly listarSesiones: ListarSesionesCasoUso,
    private readonly aceptarInvitacion: AceptarInvitacionCasoUso,
    private readonly obtenerUsuarioActual: ObtenerUsuarioActualCasoUso,
    private readonly solicitarRecuperacion: SolicitarRecuperacionCasoUso,
    private readonly restablecerContrasena: RestablecerContrasenaCasoUso,
    private readonly cookies: CookiesServicio,
  ) {}

  @Post('iniciar-sesion')
  @UseGuards(ThrottlerGuard)
  async postIniciarSesion(
    @Body({ schema: esquemaIniciarSesion }) cuerpo: z.infer<typeof esquemaIniciarSesion>,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ usuario: UsuarioPublico }> {
    const resultado = await this.iniciarSesion.ejecutar(cuerpo);
    this.cookies.establecerAcceso(res, resultado.acceso.token, resultado.acceso.expira);
    this.cookies.establecerRenovacion(res, resultado.renovacion.token, resultado.renovacion.expira);
    return { usuario: resultado.usuario };
  }

  @Post('invitaciones/aceptar')
  @UseGuards(ThrottlerGuard)
  async postAceptarInvitacion(
    @Body({ schema: esquemaAceptarInvitacion }) cuerpo: z.infer<typeof esquemaAceptarInvitacion>,
  ): Promise<{ estado: 'activada' }> {
    await this.aceptarInvitacion.ejecutar(cuerpo);
    return { estado: 'activada' };
  }

  @Post('contrasena/recuperar')
  @UseGuards(ThrottlerGuard)
  async postSolicitarRecuperacion(
    @Body({ schema: esquemaSolicitarRecuperacion })
    cuerpo: z.infer<typeof esquemaSolicitarRecuperacion>,
  ): Promise<{ estado: 'ok' }> {
    await this.solicitarRecuperacion.ejecutar(cuerpo.correo);
    return { estado: 'ok' };
  }

  @Post('contrasena/restablecer')
  async postRestablecerContrasena(
    @Body({ schema: esquemaRestablecerContrasena })
    cuerpo: z.infer<typeof esquemaRestablecerContrasena>,
  ): Promise<{ estado: 'ok' }> {
    await this.restablecerContrasena.ejecutar(cuerpo);
    return { estado: 'ok' };
  }

  @Post('renovar')
  @UseGuards(CsrfGuard)
  async postRenovar(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ estado: 'ok' }> {
    const token: unknown = req.cookies?.[COOKIE_RENOVACION];
    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException();
    }
    const resultado = await this.renovarSesion.ejecutar(token);
    this.cookies.establecerAcceso(res, resultado.acceso.token, resultado.acceso.expira);
    this.cookies.establecerRenovacion(res, resultado.renovacion.token, resultado.renovacion.expira);
    return { estado: 'ok' };
  }

  @Post('cerrar-sesion')
  @UseGuards(AutenticacionGuard, CsrfGuard)
  async postCerrarSesion(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ estado: 'ok' }> {
    await this.cerrarSesion.ejecutar(usuario.idUsuario, usuario.idSesion);
    this.cookies.limpiar(res);
    return { estado: 'ok' };
  }

  @Post('cerrar-sesiones')
  @UseGuards(AutenticacionGuard, CsrfGuard)
  async postCerrarSesiones(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ estado: 'ok' }> {
    await this.cerrarTodasSesiones.ejecutar(usuario.idUsuario);
    this.cookies.limpiar(res);
    return { estado: 'ok' };
  }

  @Post('actividad')
  @UseGuards(AutenticacionGuard, CsrfGuard)
  async postActividad(@UsuarioActual() usuario: UsuarioAutenticado): Promise<{ estado: 'ok' }> {
    await this.registrarActividad.ejecutar(usuario.idSesion);
    return { estado: 'ok' };
  }

  @Get('yo')
  @UseGuards(AutenticacionGuard)
  async getYo(@UsuarioActual() usuario: UsuarioAutenticado): Promise<{ usuario: UsuarioPublico }> {
    const datos = await this.obtenerUsuarioActual.ejecutar(usuario.idUsuario);
    return { usuario: datos };
  }

  @Get('sesiones')
  @UseGuards(AutenticacionGuard)
  async getSesiones(
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<{ data: SesionPublica[] }> {
    const data = await this.listarSesiones.ejecutar(usuario.idUsuario);
    return { data };
  }

  @Post('sesiones/:idSesion/cerrar')
  @UseGuards(AutenticacionGuard, CsrfGuard)
  async postCerrarSesionPropia(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param('idSesion', { schema: z.string().uuid() }) idSesion: string,
  ): Promise<{ estado: 'ok' }> {
    await this.cerrarSesion.ejecutar(usuario.idUsuario, usuario.idSesion, idSesion);
    return { estado: 'ok' };
  }
}
