import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import type { CentroMedico } from '../../../generado/prisma/client.js';

export interface NuevoCentro {
  nombre: string;
  nombreNormalizado: string;
  dirEstado: string;
  dirMunicipio: string;
  municipioNormalizado: string;
  dirParroquia: string;
  dirComunidad: string | null;
  idFisioterapeutaCreador: string;
}

// Catálogo compartido (ADR-0004): las consultas NO filtran por fisioterapeuta.
// Solo lectura e inserción; la base de datos no permite editar ni borrar.
@Injectable()
export class CentroRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorNombre(terminoNormalizado: string, limite: number): Promise<CentroMedico[]> {
    return this.prisma.centroMedico.findMany({
      where: { nombreNormalizado: { contains: terminoNormalizado } },
      orderBy: { nombreNormalizado: 'asc' },
      take: limite,
    });
  }

  async buscarDuplicado(
    nombreNormalizado: string,
    dirEstado: string,
    municipioNormalizado: string,
  ): Promise<CentroMedico | null> {
    return this.prisma.centroMedico.findUnique({
      where: {
        nombreNormalizado_dirEstado_municipioNormalizado: {
          nombreNormalizado,
          dirEstado,
          municipioNormalizado,
        },
      },
    });
  }

  async crear(centro: NuevoCentro): Promise<CentroMedico> {
    return this.prisma.centroMedico.create({ data: centro });
  }

  async buscarPorIds(ids: readonly string[]): Promise<CentroMedico[]> {
    if (ids.length === 0) return [];
    return this.prisma.centroMedico.findMany({ where: { idCentro: { in: [...ids] } } });
  }
}
