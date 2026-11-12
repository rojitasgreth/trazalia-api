import { Module } from '@nestjs/common';
import { CorreoModule } from '../../compartido/correo/correo.module.js';
import { AuditoriaController } from '../auditoria/auditoria.controller.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';
import { AutenticacionController } from './autenticacion.controller.js';
import { UsuariosController } from './usuarios.controller.js';
import { AceptarInvitacionCasoUso } from './casos-uso/aceptar-invitacion.caso-uso.js';
import { ActualizarUsuarioCasoUso } from './casos-uso/actualizar-usuario.caso-uso.js';
import { AdminCerrarSesionCasoUso } from './casos-uso/admin-cerrar-sesion.caso-uso.js';
import { CerrarSesionCasoUso } from './casos-uso/cerrar-sesion.caso-uso.js';
import { CerrarTodasSesionesCasoUso } from './casos-uso/cerrar-todas-sesiones.caso-uso.js';
import { CrearUsuarioCasoUso } from './casos-uso/crear-usuario.caso-uso.js';
import { DesbloquearUsuarioCasoUso } from './casos-uso/desbloquear-usuario.caso-uso.js';
import { InactivarUsuarioCasoUso } from './casos-uso/inactivar-usuario.caso-uso.js';
import { IniciarSesionCasoUso } from './casos-uso/iniciar-sesion.caso-uso.js';
import { ListarSesionesDeUsuarioCasoUso } from './casos-uso/listar-sesiones-de-usuario.caso-uso.js';
import { ListarSesionesCasoUso } from './casos-uso/listar-sesiones.caso-uso.js';
import { ListarUsuariosCasoUso } from './casos-uso/listar-usuarios.caso-uso.js';
import { ObtenerUsuarioActualCasoUso } from './casos-uso/obtener-usuario-actual.caso-uso.js';
import { ObtenerUsuarioCasoUso } from './casos-uso/obtener-usuario.caso-uso.js';
import { ReactivarUsuarioCasoUso } from './casos-uso/reactivar-usuario.caso-uso.js';
import { ReenviarInvitacionCasoUso } from './casos-uso/reenviar-invitacion.caso-uso.js';
import { RegistrarActividadCasoUso } from './casos-uso/registrar-actividad.caso-uso.js';
import { RenovarSesionCasoUso } from './casos-uso/renovar-sesion.caso-uso.js';
import { RestablecerContrasenaCasoUso } from './casos-uso/restablecer-contrasena.caso-uso.js';
import { SolicitarRecuperacionCasoUso } from './casos-uso/solicitar-recuperacion.caso-uso.js';
import { SuspenderUsuarioCasoUso } from './casos-uso/suspender-usuario.caso-uso.js';
import { AutenticacionGuard } from './guardias/autenticacion.guard.js';
import { CsrfGuard } from './guardias/csrf.guard.js';
import { RolesGuard } from './guardias/roles.guard.js';
import { CookiesServicio } from './jwt/cookies.servicio.js';
import { JwtServicio } from './jwt/jwt.servicio.js';
import { IntentoAccesoRepositorio } from './repositorios/intento-acceso.repositorio.js';
import { InvitacionRepositorio } from './repositorios/invitacion.repositorio.js';
import { RecuperacionRepositorio } from './repositorios/recuperacion.repositorio.js';
import { RenovacionRepositorio } from './repositorios/renovacion.repositorio.js';
import { SesionRepositorio } from './repositorios/sesion.repositorio.js';
import { UsuarioRepositorio } from './repositorios/usuario.repositorio.js';

@Module({
  imports: [AuditoriaModule, CorreoModule],
  controllers: [AutenticacionController, UsuariosController, AuditoriaController],
  providers: [
    JwtServicio,
    CookiesServicio,
    AutenticacionGuard,
    CsrfGuard,
    RolesGuard,
    UsuarioRepositorio,
    SesionRepositorio,
    RenovacionRepositorio,
    InvitacionRepositorio,
    RecuperacionRepositorio,
    IntentoAccesoRepositorio,
    IniciarSesionCasoUso,
    RenovarSesionCasoUso,
    CerrarSesionCasoUso,
    CerrarTodasSesionesCasoUso,
    RegistrarActividadCasoUso,
    ListarSesionesCasoUso,
    AceptarInvitacionCasoUso,
    ObtenerUsuarioActualCasoUso,
    CrearUsuarioCasoUso,
    ListarUsuariosCasoUso,
    ObtenerUsuarioCasoUso,
    ActualizarUsuarioCasoUso,
    SuspenderUsuarioCasoUso,
    ReactivarUsuarioCasoUso,
    InactivarUsuarioCasoUso,
    ReenviarInvitacionCasoUso,
    ListarSesionesDeUsuarioCasoUso,
    AdminCerrarSesionCasoUso,
    DesbloquearUsuarioCasoUso,
    SolicitarRecuperacionCasoUso,
    RestablecerContrasenaCasoUso,
  ],
  exports: [AutenticacionGuard, RolesGuard],
})
export class AccesoModule {}
