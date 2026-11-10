import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { verificarContrasena } from '../../../compartido/seguridad/contrasena.js';
import { resumir } from '../../../compartido/seguridad/resumen.js';
import { JwtServicio, type TokenFirmado } from '../jwt/jwt.servicio.js';
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

// Flujo 7.2 / AC-008, AC-009, AC-010.
@Injectable()
export class IniciarSesionCasoUso {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly sesiones: SesionRepositorio,
    private readonly renovaciones: RenovacionRepositorio,
    private readonly jwt: JwtServicio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(comando: IniciarSesionComando): Promise<IniciarSesionResultado> {
    const usuario = await this.usuarios.buscarPorIdentificador(comando.identificador);

    // AC-010: cuenta PENDIENTE/BLOQUEADA/SUSPENDIDA/INACTIVA, usuario inexistente
    // o contraseña incorrecta reciben exactamente el mismo mensaje genérico.
    const contrasenaValida =
      usuario?.hashContrasena != null &&
      (await verificarContrasena(usuario.hashContrasena, comando.contrasena));

    if (!usuario || usuario.estado !== 'ACTIVO' || !contrasenaValida) {
      await this.auditoria.registrar({
        idUsuarioActor: usuario?.idUsuario,
        tipoEvento: 'inicio_sesion',
        resultado: 'FALLIDO',
        metadatosMinimos: { identificador: comando.identificador },
      });
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
}
