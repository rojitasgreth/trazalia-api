import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { resumir } from '../../../compartido/seguridad/resumen.js';
import { JwtServicio, type TokenFirmado } from '../jwt/jwt.servicio.js';
import { RenovacionRepositorio } from '../repositorios/renovacion.repositorio.js';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { expiroPorInactividad } from '../sesiones/politica-inactividad.js';

export interface RenovarSesionResultado {
  acceso: TokenFirmado;
  renovacion: TokenFirmado;
}

// Flujo 7.3 / AC-014 a AC-017: rotación de refresh con detección de reutilización.
@Injectable()
export class RenovarSesionCasoUso {
  constructor(
    private readonly jwt: JwtServicio,
    private readonly sesiones: SesionRepositorio,
    private readonly renovaciones: RenovacionRepositorio,
    private readonly usuarios: UsuarioRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(tokenRenovacion: string): Promise<RenovarSesionResultado> {
    const verificado = await this.jwt.verificarRenovacion(tokenRenovacion).catch(() => null);
    if (!verificado) {
      throw new UnauthorizedException();
    }
    const { sub: idUsuario, sid: idSesion } = verificado.claims;
    const resumenJtiPresentado = resumir(verificado.jti);

    const registro = await this.renovaciones.buscarPorResumenJti(resumenJtiPresentado);
    if (!registro) {
      throw new UnauthorizedException();
    }

    // AC-017: el refresh ya fue consumido o revocado — reutilización detectada.
    if (registro.fechaConsumo || registro.fechaRevocacion) {
      await this.renovaciones.revocarFamiliaDeSesion(idSesion);
      await this.sesiones.revocar(idSesion, 'reutilizacion_refresh');
      await this.auditoria.registrar({
        idUsuarioActor: idUsuario,
        tipoEvento: 'renovacion_sesion',
        resultado: 'REUTILIZACION_DETECTADA',
        metadatosMinimos: { idSesion },
      });
      throw new UnauthorizedException();
    }

    const sesion = await this.sesiones.buscarPorId(idSesion);
    if (!sesion || sesion.fechaRevocacion || registro.fechaExpiracion < new Date()) {
      throw new UnauthorizedException();
    }
    // BR-024: la renovación por sí sola no es actividad humana; si ya expiró
    // por inactividad, se rechaza igual que cualquier otra solicitud (AC-021).
    if (expiroPorInactividad(sesion.ultimaActividad)) {
      await this.sesiones.revocar(idSesion, 'inactividad');
      throw new UnauthorizedException();
    }

    // Revalida la cuenta en cada renovación (AC-028): un cambio de rol o
    // estado se aplica desde la siguiente emisión de tokens.
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario || usuario.estado !== 'ACTIVO') {
      await this.sesiones.revocar(idSesion, 'cuenta_no_activa');
      throw new UnauthorizedException();
    }

    const nuevaRenovacion = await this.jwt.firmarRenovacion({ sub: idUsuario, sid: idSesion });
    const nuevoRegistro = await this.renovaciones.crear(
      idSesion,
      resumir(nuevaRenovacion.jti),
      nuevaRenovacion.expira,
    );
    await this.renovaciones.marcarConsumidoYReemplazado(
      registro.idRegistroToken,
      nuevoRegistro.idRegistroToken,
    );
    await this.sesiones.actualizarJtiRefresh(
      idSesion,
      resumir(nuevaRenovacion.jti),
      nuevaRenovacion.expira,
    );

    const acceso = await this.jwt.firmarAcceso({
      sub: idUsuario,
      role: usuario.rol,
      sid: idSesion,
    });

    await this.auditoria.registrar({
      idUsuarioActor: idUsuario,
      tipoEvento: 'renovacion_sesion',
      resultado: 'EXITOSO',
      metadatosMinimos: { idSesion },
    });

    return { acceso, renovacion: nuevaRenovacion };
  }
}
