import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';
import { AutenticacionController } from './autenticacion.controller.js';
import { AceptarInvitacionCasoUso } from './casos-uso/aceptar-invitacion.caso-uso.js';
import { CerrarSesionCasoUso } from './casos-uso/cerrar-sesion.caso-uso.js';
import { CerrarTodasSesionesCasoUso } from './casos-uso/cerrar-todas-sesiones.caso-uso.js';
import { IniciarSesionCasoUso } from './casos-uso/iniciar-sesion.caso-uso.js';
import { ListarSesionesCasoUso } from './casos-uso/listar-sesiones.caso-uso.js';
import { ObtenerUsuarioActualCasoUso } from './casos-uso/obtener-usuario-actual.caso-uso.js';
import { RegistrarActividadCasoUso } from './casos-uso/registrar-actividad.caso-uso.js';
import { RenovarSesionCasoUso } from './casos-uso/renovar-sesion.caso-uso.js';
import { AutenticacionGuard } from './guardias/autenticacion.guard.js';
import { CsrfGuard } from './guardias/csrf.guard.js';
import { CookiesServicio } from './jwt/cookies.servicio.js';
import { JwtServicio } from './jwt/jwt.servicio.js';
import { InvitacionRepositorio } from './repositorios/invitacion.repositorio.js';
import { RenovacionRepositorio } from './repositorios/renovacion.repositorio.js';
import { SesionRepositorio } from './repositorios/sesion.repositorio.js';
import { UsuarioRepositorio } from './repositorios/usuario.repositorio.js';

@Module({
  imports: [AuditoriaModule],
  controllers: [AutenticacionController],
  providers: [
    JwtServicio,
    CookiesServicio,
    AutenticacionGuard,
    CsrfGuard,
    UsuarioRepositorio,
    SesionRepositorio,
    RenovacionRepositorio,
    InvitacionRepositorio,
    IniciarSesionCasoUso,
    RenovarSesionCasoUso,
    CerrarSesionCasoUso,
    CerrarTodasSesionesCasoUso,
    RegistrarActividadCasoUso,
    ListarSesionesCasoUso,
    AceptarInvitacionCasoUso,
    ObtenerUsuarioActualCasoUso,
  ],
  exports: [AutenticacionGuard],
})
export class AccesoModule {}
