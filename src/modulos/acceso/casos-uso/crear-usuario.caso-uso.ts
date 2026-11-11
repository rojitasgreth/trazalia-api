import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Entorno } from '../../../configuracion/entorno.js';
import { CorreoServicio } from '../../../compartido/correo/correo.servicio.js';
import { generarTokenAleatorio, resumir } from '../../../compartido/seguridad/resumen.js';
import { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import { esConflictoDeUnicidad } from '../../../compartido/prisma/errores.js';
import {
  construirEnlaceActivacion,
  formatearFechaVencimiento,
  perfilLegible,
} from '../dominio/invitacion-correo.js';
import { generarNombreUsuario } from '../dominio/nombre-usuario.js';
import type { Nacionalidad, RolUsuario } from '../../../generado/prisma/enums.js';
import { InvitacionRepositorio } from '../repositorios/invitacion.repositorio.js';
import { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { aUsuarioPublico, type UsuarioPublico } from '../vista/usuario-publico.js';

const VIDA_INVITACION_MS = 24 * 60 * 60 * 1000;

export interface CrearUsuarioComando {
  nacionalidad: Nacionalidad;
  cedula: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  rol: RolUsuario;
}

// Flujo 7.1 (creación) / BR-002–005 / AC-001–003.
@Injectable()
export class CrearUsuarioCasoUso {
  constructor(
    private readonly usuarios: UsuarioRepositorio,
    private readonly invitaciones: InvitacionRepositorio,
    private readonly correo: CorreoServicio,
    private readonly auditoria: AuditoriaServicio,
    private readonly config: ConfigService<Entorno, true>,
  ) {}

  async ejecutar(idAdministrador: string, comando: CrearUsuarioComando): Promise<UsuarioPublico> {
    const administrador = await this.usuarios.buscarPorId(idAdministrador);
    if (!administrador) {
      throw new NotFoundException();
    }

    const nombreUsuario = generarNombreUsuario(comando.nacionalidad, comando.cedula);

    let usuario;
    try {
      usuario = await this.usuarios.crear({ ...comando, nombreUsuario });
    } catch (error) {
      if (esConflictoDeUnicidad(error)) {
        throw new ConflictException(
          'Ya existe una cuenta con esa cédula, ese correo o ese nombre de usuario.',
        );
      }
      throw error;
    }

    const token = generarTokenAleatorio();
    const fechaExpiracion = new Date(Date.now() + VIDA_INVITACION_MS);
    await this.invitaciones.crear(
      usuario.idUsuario,
      resumir(token),
      fechaExpiracion,
      idAdministrador,
    );

    await this.auditoria.registrar({
      idUsuarioActor: idAdministrador,
      idUsuarioAfectado: usuario.idUsuario,
      tipoEvento: 'creacion_usuario',
      resultado: 'EXITOSO',
      metadatosMinimos: { nombreUsuario, rol: usuario.rol },
    });

    await this.correo.enviarInvitacion({
      para: usuario.correo,
      nombre: usuario.nombre,
      nombreAdmin: `${administrador.nombre} ${administrador.apellido}`,
      perfil: perfilLegible(usuario.rol),
      usuario: nombreUsuario,
      correo: usuario.correo,
      enlaceActivacion: construirEnlaceActivacion(
        this.config.get('ORIGEN_WEB', { infer: true }),
        token,
      ),
      fechaVencimiento: formatearFechaVencimiento(
        fechaExpiracion,
        this.config.get('ZONA_HORARIA_NEGOCIO', { infer: true }),
      ),
    });

    return aUsuarioPublico(usuario);
  }
}
