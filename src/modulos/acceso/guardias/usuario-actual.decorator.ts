import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { RequestAutenticado, UsuarioAutenticado } from './autenticacion.guard.js';

// Exportada por separado para poder probarla sin el envoltorio de decorador
// (patrón recomendado por NestJS para los param decorators personalizados).
export function extraerUsuarioActual(
  _dato: unknown,
  contexto: ExecutionContext,
): UsuarioAutenticado {
  const request = contexto.switchToHttp().getRequest<RequestAutenticado>();
  return request.usuarioAutenticado;
}

/** Requiere que el handler use @UseGuards(AutenticacionGuard). */
export const UsuarioActual = createParamDecorator(extraerUsuarioActual);
