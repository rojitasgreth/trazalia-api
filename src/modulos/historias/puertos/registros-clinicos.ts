import { Injectable } from '@nestjs/common';

/**
 * SPEC §13 (pendiente de implementación): cómo saber si una historia tiene
 * registros clínicos (valoraciones, evoluciones…) de módulos futuros. Decide si
 * se elimina o se archiva. Las fases clínicas aportarán su implementación real.
 */
export interface RegistrosClinicos {
  tieneRegistros(idFisioterapeuta: string, idHistoria: string): Promise<boolean>;
}

export const REGISTROS_CLINICOS = Symbol('REGISTROS_CLINICOS');

/** Fase actual: todavía no existe ninguna entidad clínica (decisión del 16-11-2026). */
@Injectable()
export class SinRegistrosClinicos implements RegistrosClinicos {
  tieneRegistros(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
