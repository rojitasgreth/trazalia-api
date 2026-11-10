// BR-022/023/036: 60 min de inactividad humana expiran la sesión; la
// advertencia a los 55 min es responsabilidad exclusiva de la interfaz. El
// servidor solo conoce y aplica el corte de 60 minutos.
export const INACTIVIDAD_MAXIMA_MS = 60 * 60 * 1000;

export function expiroPorInactividad(ultimaActividad: Date, ahora: Date = new Date()): boolean {
  return ahora.getTime() - ultimaActividad.getTime() > INACTIVIDAD_MAXIMA_MS;
}
