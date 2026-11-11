import type { Usuario } from '../../../generado/prisma/client.js';

// Vista para las pantallas de administración (A13/A14): más campos que
// UsuarioPublico (self-service), pero nunca hashContrasena.
export interface UsuarioAdministrado {
  idUsuario: string;
  nacionalidad: Usuario['nacionalidad'];
  cedula: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  nombreUsuario: string;
  rol: Usuario['rol'];
  estado: Usuario['estado'];
  fechaCreacion: Date;
  fechaActivacion: Date | null;
  ultimoAcceso: Date | null;
}

export function aUsuarioAdministrado(usuario: Usuario): UsuarioAdministrado {
  return {
    idUsuario: usuario.idUsuario,
    nacionalidad: usuario.nacionalidad,
    cedula: usuario.cedula,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    correo: usuario.correo,
    telefono: usuario.telefono,
    nombreUsuario: usuario.nombreUsuario,
    rol: usuario.rol,
    estado: usuario.estado,
    fechaCreacion: usuario.fechaCreacion,
    fechaActivacion: usuario.fechaActivacion,
    ultimoAcceso: usuario.ultimoAcceso,
  };
}
