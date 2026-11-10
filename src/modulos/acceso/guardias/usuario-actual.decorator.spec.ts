import type { ExecutionContext } from '@nestjs/common';
import type { RequestAutenticado } from './autenticacion.guard.js';
import { extraerUsuarioActual } from './usuario-actual.decorator.js';

describe('extraerUsuarioActual', () => {
  it('devuelve el usuario autenticado adjuntado por el guard', () => {
    const usuarioAutenticado = { idUsuario: 'u1', rol: 'FISIOTERAPEUTA', idSesion: 's1' };
    const request = { usuarioAutenticado } as unknown as RequestAutenticado;
    const contexto = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(extraerUsuarioActual(undefined, contexto)).toEqual(usuarioAutenticado);
  });
});
