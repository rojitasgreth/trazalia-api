import { randomUUID } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Entorno } from '../../../configuracion/entorno.js';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { verificarContrasena } from '../../../compartido/seguridad/contrasena.js';
import { resumir } from '../../../compartido/seguridad/resumen.js';
import { JwtServicio, type TokenFirmado } from '../jwt/jwt.servicio.js';
import { IntentoAccesoRepositorio } from '../repositorios/intento-acceso.repositorio.js';
import { RenovacionRepositorio } from '../repositorios/renovacion.repositorio.js';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { aUsuarioPublico, type UsuarioPublico } from '../vista/usuario-publico.js';

export interface IniciarSesionComando {
  identificador: string;
  contrasena: string;
  etiquetaDispositivo?: string;
}

export interface IniciarSesionResultado {
  usuario: UsuarioPublico;
  acceso: TokenFirmado;
  renovacion: TokenFirmado;
}

const MENSAJE_BLOQUEO =
  'Por seguridad, el acceso está pausado. Inténtalo de nuevo más tarde o recupera tu contraseña.';

// Flujo 7.2 / AC-008, AC-009, AC-010, AC-025, AC-035.
@Injectable()
export class IniciarSesionCasoUso {
  private readonly umbral: number;
  private readonly ventanaMs: number;
  private readonly duracionBloqueoMs: number;

  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly sesiones: SesionRepositorio,
    private readonly renovaciones: RenovacionRepositorio,
    private readonly intentos: IntentoAccesoRepositorio,
    private readonly jwt: JwtServicio,
    private readonly auditoria: AuditoriaServicio,
    config: ConfigService<Entorno, true>,
  ) {
    this.umbral = config.get('BLOQUEO_UMBRAL_INTENTOS', { infer: true });
    this.ventanaMs = config.get('BLOQUEO_VENTANA_MINUTOS', { infer: true }) * 60 * 1000;
    this.duracionBloqueoMs = config.get('BLOQUEO_DURACION_MINUTOS', { infer: true }) * 60 * 1000;
  }

  async ejecutar(comando: IniciarSesionComando): Promise<IniciarSesionResultado> {
    const identificadorNormalizado = comando.identificador.trim().toLowerCase();
    let usuario = await this.usuarios.buscarPorIdentificador(comando.identificador);

    if (usuario?.estado === 'BLOQUEADO') {
      if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
        // Todavía bloqueado: ni siquiera se verifica la contraseña (evita
        // gastar Argon2 en vano — §16 rendimiento).
        await this.auditoria.registrar({
          idUsuarioActor: usuario.idUsuario,
          tipoEvento: 'inicio_sesion',
          resultado: 'FALLIDO',
          metadatosMinimos: { identificador: comando.identificador, motivo: 'bloqueado' },
        });
        throw this.excepcionBloqueo();
      }
      // BR-035: se desbloquea automáticamente en el siguiente intento posterior al vencer el plazo.
      await this.usuarios.desbloquear(usuario.idUsuario);
      usuario = { ...usuario, estado: 'ACTIVO', bloqueadoHasta: null };
    }

    // AC-010: cuenta PENDIENTE/SUSPENDIDA/INACTIVA, usuario inexistente o
    // contraseña incorrecta reciben exactamente el mismo mensaje genérico.
    const contrasenaValida =
      usuario?.hashContrasena != null &&
      (await verificarContrasena(usuario.hashContrasena, comando.contrasena));

    if (!usuario || usuario.estado !== 'ACTIVO' || !contrasenaValida) {
      const inicioVentana = new Date(Date.now() - this.ventanaMs);
      await this.intentos.registrarFallo(identificadorNormalizado, inicioVentana);
      const fallos = await this.intentos.contarFallosRecientes(
        identificadorNormalizado,
        inicioVentana,
      );

      await this.auditoria.registrar({
        idUsuarioActor: usuario?.idUsuario,
        tipoEvento: 'inicio_sesion',
        resultado: 'FALLIDO',
        metadatosMinimos: { identificador: comando.identificador },
      });

      // BR-035/AC-025/AC-035: el umbral se evalúa por identificador, exista o
      // no la cuenta, y la respuesta de bloqueo es idéntica en ambos casos.
      if (fallos >= this.umbral) {
        if (usuario?.estado === 'ACTIVO') {
          await this.usuarios.bloquear(
            usuario.idUsuario,
            new Date(Date.now() + this.duracionBloqueoMs),
          );
          await this.auditoria.registrar({
            idUsuarioAfectado: usuario.idUsuario,
            tipoEvento: 'bloqueo',
            resultado: 'EXITOSO',
            metadatosMinimos: { actor: 'sistema', motivo: 'intentos_fallidos' },
          });
        }
        throw this.excepcionBloqueo();
      }

      throw new UnauthorizedException('Credenciales inválidas');
    }

    const idSesion = randomUUID();
    const renovacion = await this.jwt.firmarRenovacion({ sub: usuario.idUsuario, sid: idSesion });
    const sesion = await this.sesiones.crear({
      idSesion,
      idUsuario: usuario.idUsuario,
      resumenJtiRefresh: resumir(renovacion.jti),
      fechaExpiracion: renovacion.expira,
      etiquetaDispositivo: comando.etiquetaDispositivo,
    });
    await this.renovaciones.crear(sesion.idSesion, resumir(renovacion.jti), renovacion.expira);

    const acceso = await this.jwt.firmarAcceso({
      sub: usuario.idUsuario,
      role: usuario.rol,
      sid: sesion.idSesion,
    });

    await this.usuarios.registrarAcceso(usuario.idUsuario);
    await this.auditoria.registrar({
      idUsuarioActor: usuario.idUsuario,
      tipoEvento: 'inicio_sesion',
      resultado: 'EXITOSO',
      metadatosMinimos: { idSesion: sesion.idSesion },
    });

    return { usuario: aUsuarioPublico(usuario), acceso, renovacion };
  }

  private excepcionBloqueo(): HttpException {
    return new HttpException(MENSAJE_BLOQUEO, HttpStatus.LOCKED);
  }
}
