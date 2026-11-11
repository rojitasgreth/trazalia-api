// Helpers puros para armar el contenido del correo de invitación (BR-007),
// reutilizados por el comando de consola (BR-037) y por CrearUsuarioCasoUso /
// ReenviarInvitacionCasoUso.
export function construirEnlaceActivacion(origenWeb: string, token: string): string {
  return `${origenWeb}/activar-cuenta?token=${encodeURIComponent(token)}`;
}

export function formatearFechaVencimiento(fecha: Date, zonaHoraria: string): string {
  return new Intl.DateTimeFormat('es-VE', {
    timeZone: zonaHoraria,
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(fecha);
}

const PERFILES_LEGIBLES: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  FISIOTERAPEUTA: 'Fisioterapeuta',
};

export function perfilLegible(rol: string): string {
  return PERFILES_LEGIBLES[rol] ?? rol;
}
