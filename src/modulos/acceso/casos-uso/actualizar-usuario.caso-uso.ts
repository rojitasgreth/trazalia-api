import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { esConflictoDeUnicidad } from '../../../compartido/prisma/errores.js';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { RolUsuario } from '../../../generado/prisma/enums.js';
import { InvitacionRepositorio } from '../repositorios/invitacion.repositorio.js';
import { SesionRepositorio } from '../repositorios/sesion.repositorio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { aUsuarioAdministrado, type UsuarioAdministrado } from '../vista/usuario-administrado.js';

export interface ActualizarUsuarioComando {
  nombre?: string;
  apellido?: string;
  telefono?: string | null;
  correo?: string;
  rol?: RolUsuario;
}

// BR-030/BR-033/BR-034 / AC-028.
@Injectable()
export class ActualizarUsuarioCasoUso {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly invitaciones: InvitacionRepositorio,
    private readonly sesiones: SesionRepositorio,
    private readonly auditoria: AuditoriaServicio,
  ) {}

  async ejecutar(
    idAdministrador: string,
    idUsuario: string,
    comando: ActualizarUsuarioComando,
  ): Promise<UsuarioAdministrado> {
    const usuario = await this.usuarios.buscarPorId(idUsuario);
    if (!usuario) {
      throw new NotFoundException();
    }

    if (comando.rol && comando.rol !== usuario.rol) {
      if (idUsuario === idAdministrador) {
        throw new ForbiddenException('No puedes cambiar tu propio rol.');
      }
      const resultado = await this.usuarios.cambiarRolProtegido(idUsuario, comando.rol);
      if (!resultado.ok) {
        throw new ForbiddenException(
          'El sistema debe conservar siempre al menos un administrador activo.',
        );
      }
      await this.sesiones.revocarTodasDeUsuario(idUsuario, 'cambio_rol');
      await this.auditoria.registrar({
        idUsuarioActor: idAdministrador,
        idUsuarioAfectado: idUsuario,
        tipoEvento: 'cambio_rol',
        resultado: 'EXITOSO',
        metadatosMinimos: { rolAnterior: usuario.rol, rolNuevo: comando.rol },
      });
    }

    const { rol: _rol, ...datosBasicos } = comando;
    const camposEditados = Object.keys(datosBasicos);
    if (camposEditados.length > 0) {
      if (datosBasicos.correo && datosBasicos.correo.trim().toLowerCase() !== usuario.correo) {
        const vigente = await this.invitaciones.buscarVigentePorUsuario(idUsuario);
        if (vigente) {
          await this.invitaciones.invalidar(vigente.idInvitacion);
        }
      }

      try {
        await this.usuarios.actualizarDatos(idUsuario, datosBasicos);
      } catch (error) {
        if (esConflictoDeUnicidad(error)) {
          throw new ConflictException('Ya existe otra cuenta con ese correo.');
        }
        throw error;
      }

      await this.auditoria.registrar({
        idUsuarioActor: idAdministrador,
        idUsuarioAfectado: idUsuario,
        tipoEvento: 'edicion_usuario',
        resultado: 'EXITOSO',
        metadatosMinimos: { camposEditados },
      });
    }

    return aUsuarioAdministrado((await this.usuarios.buscarPorId(idUsuario))!);
  }
}
