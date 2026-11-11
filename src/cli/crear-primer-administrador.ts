import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../app.module.js';
import { AuditoriaServicio } from '../modulos/auditoria/auditoria.servicio.js';
import { CorreoServicio } from '../compartido/correo/correo.servicio.js';
import { InvitacionRepositorio } from '../modulos/acceso/repositorios/invitacion.repositorio.js';
import { UsuarioRepositorio } from '../modulos/acceso/repositorios/usuario.repositorio.js';
import { generarNombreUsuario } from '../modulos/acceso/dominio/nombre-usuario.js';
import {
  construirEnlaceActivacion,
  formatearFechaVencimiento,
  perfilLegible,
} from '../modulos/acceso/dominio/invitacion-correo.js';
import { generarTokenAleatorio, resumir } from '../compartido/seguridad/resumen.js';
import type { Nacionalidad } from '../generado/prisma/enums.js';
import type { Entorno } from '../configuracion/entorno.js';

// BR-037: crea el primer administrador (estado PENDIENTE) y emite su
// invitación estándar (DP-03: 24h), auditado con actor "sistema".
//
// Se ejecuta compilado (node dist/..., vía el script de npm), nunca con tsx:
// Nest resuelve los constructores por metadata de tipos, y tsx/esbuild no
// emiten `emitDecoratorMetadata` — bajo tsx, todas las dependencias inyectadas
// llegan undefined y Nest aborta el proceso al arrancar.
// Uso:
//   npm run cli:crear-primer-administrador -- \
//     --nacionalidad=V --cedula=12345678 --nombre=Ana --apellido=Pérez --correo=ana@example.com

const VIDA_INVITACION_MS = 24 * 60 * 60 * 1000;

interface Argumentos {
  nacionalidad: Nacionalidad;
  cedula: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
}

function leerArgumentos(): Argumentos {
  const mapa = new Map<string, string>();
  for (const arg of process.argv.slice(2)) {
    const [clave, ...resto] = arg.replace(/^--/, '').split('=');
    mapa.set(clave, resto.join('='));
  }

  const requeridos = ['nacionalidad', 'cedula', 'nombre', 'apellido', 'correo'] as const;
  const faltantes = requeridos.filter((clave) => !mapa.get(clave));
  if (faltantes.length > 0) {
    throw new Error(`Faltan argumentos obligatorios: ${faltantes.join(', ')}`);
  }

  const nacionalidad = mapa.get('nacionalidad');
  if (nacionalidad !== 'V' && nacionalidad !== 'E') {
    throw new Error('nacionalidad debe ser "V" o "E"');
  }
  const cedula = mapa.get('cedula')!;
  if (!/^\d{1,9}$/.test(cedula)) {
    throw new Error('cedula debe contener solo dígitos, máximo 9');
  }

  return {
    nacionalidad,
    cedula,
    nombre: mapa.get('nombre')!,
    apellido: mapa.get('apellido')!,
    correo: mapa.get('correo')!,
    telefono: mapa.get('telefono'),
  };
}

async function principal(): Promise<void> {
  const argumentos = leerArgumentos();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  try {
    const usuarios = app.get(UsuarioRepositorio);
    const invitaciones = app.get(InvitacionRepositorio);
    const auditoria = app.get(AuditoriaServicio);
    const correo = app.get(CorreoServicio);
    const config = app.get<ConfigService<Entorno, true>>(ConfigService);

    const nombreUsuario = generarNombreUsuario(argumentos.nacionalidad, argumentos.cedula);
    const usuario = await usuarios.crear({
      nacionalidad: argumentos.nacionalidad,
      cedula: argumentos.cedula,
      nombre: argumentos.nombre,
      apellido: argumentos.apellido,
      correo: argumentos.correo,
      telefono: argumentos.telefono,
      nombreUsuario,
      rol: 'ADMINISTRADOR',
    });

    const token = generarTokenAleatorio();
    const fechaExpiracion = new Date(Date.now() + VIDA_INVITACION_MS);
    await invitaciones.crear(usuario.idUsuario, resumir(token), fechaExpiracion);

    await auditoria.registrar({
      idUsuarioAfectado: usuario.idUsuario,
      tipoEvento: 'creacion_primer_administrador',
      resultado: 'EXITOSO',
      metadatosMinimos: { actor: 'sistema', nombreUsuario },
    });

    await correo.enviarInvitacion({
      para: usuario.correo,
      nombre: usuario.nombre,
      nombreAdmin: 'el sistema',
      perfil: perfilLegible(usuario.rol),
      usuario: nombreUsuario,
      correo: usuario.correo,
      enlaceActivacion: construirEnlaceActivacion(config.get('ORIGEN_WEB', { infer: true }), token),
      fechaVencimiento: formatearFechaVencimiento(
        fechaExpiracion,
        config.get('ZONA_HORARIA_NEGOCIO', { infer: true }),
      ),
    });

    console.log('Primer administrador creado. Se envió la invitación por correo.');
    console.log(`  nombre_usuario: ${nombreUsuario}`);
    console.log(
      `  token de invitación (válido 24h, un solo uso, por si el correo no llega): ${token}`,
    );
  } finally {
    await app.close();
  }
}

await principal();
