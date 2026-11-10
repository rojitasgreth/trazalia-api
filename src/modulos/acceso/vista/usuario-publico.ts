import type { UsuarioModel } from '../../../generado/prisma/models.js';

// BR-029: los JWT y las respuestas públicas nunca incluyen hashContrasena ni
// otros datos innecesarios.
export interface UsuarioPublico {
  idUsuario: string;
  correo: string;
  nombreUsuario: string;
  nombre: string;
  apellido: string;
  rol: UsuarioModel['rol'];
}

export function aUsuarioPublico(usuario: UsuarioModel): UsuarioPublico {
  return {
    idUsuario: usuario.idUsuario,
    correo: usuario.correo,
    nombreUsuario: usuario.nombreUsuario,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    rol: usuario.rol,
  };
}
