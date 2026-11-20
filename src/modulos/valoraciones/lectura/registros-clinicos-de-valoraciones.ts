import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import type { RegistrosClinicos } from '../../historias/puertos/registros-clinicos.js';

/**
 * Implementación real del puerto de historias (ADR-0003) a cargo del módulo
 * dueño de la tabla de valoraciones. Una valoración en curso también cuenta
 * (decisión del 19-11-2026): la historia no se elimina, se archiva.
 */
@Injectable()
export class RegistrosClinicosDeValoraciones implements RegistrosClinicos {
  constructor(private readonly prisma: PrismaService) {}

  async tieneRegistros(idFisioterapeuta: string, idHistoria: string): Promise<boolean> {
    const total = await this.prisma.valoracion.count({ where: { idFisioterapeuta, idHistoria } });
    return total > 0;
  }
}
