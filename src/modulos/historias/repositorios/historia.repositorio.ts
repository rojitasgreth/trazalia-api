import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../compartido/prisma/prisma.service.js';
import type { Prisma } from '../../../generado/prisma/client.js';
import type {
  EstadoHistoria,
  NacionalidadPaciente,
  TipoHistoria,
} from '../../../generado/prisma/enums.js';
import type { DatosPersonales, DatosRepresentante } from '../dominio/datos-personales.js';

const INCLUIR = { representante: true } as const;

export type HistoriaConRepresentante = Prisma.HistoriaClinicaGetPayload<{
  include: typeof INCLUIR;
}>;

export interface FiltrosHistorias {
  texto?: string;
  tipo?: TipoHistoria;
  estado?: EstadoHistoria;
  archivadas: boolean;
  creadaDesde?: string;
  creadaHasta?: string;
  pagina: number;
  porPagina: number;
}

export interface HistoriaDelPaciente {
  idHistoria: string;
  tipo: TipoHistoria;
  estado: EstadoHistoria;
  archivada: boolean;
}

/** `AAAA-MM-DD` ↔ columna DATE (medianoche UTC, sin desplazamiento de zona). */
export function aFechaBd(fecha: string | null): Date | null {
  return fecha ? new Date(`${fecha}T00:00:00.000Z`) : null;
}

export function deFechaBd(fecha: Date | null): string | null {
  return fecha ? fecha.toISOString().slice(0, 10) : null;
}

function aColumnas(datos: DatosPersonales) {
  return { ...datos, fechaNacimiento: aFechaBd(datos.fechaNacimiento) };
}

export function aColumnasRepresentante(representante: DatosRepresentante) {
  return { ...representante, fechaNacimiento: aFechaBd(representante.fechaNacimiento) };
}

// Todas las consultas reciben el id del fisioterapeuta autenticado y filtran
// por él (Documento Cero §7, RF-024): no existe lectura sin propietario.
@Injectable()
export class HistoriaRepositorio {
  constructor(private readonly prisma: PrismaService) {}

  /** SPEC §7.2: historias propias con el mismo documento (cualquier tipo). */
  async buscarPorDocumento(
    idFisioterapeuta: string,
    nacionalidad: NacionalidadPaciente,
    cedula: string,
  ): Promise<HistoriaConRepresentante[]> {
    return this.prisma.historiaClinica.findMany({
      where: { idFisioterapeuta, nacionalidad, cedula },
      include: INCLUIR,
      orderBy: { fechaActualizacion: 'desc' },
    });
  }

  /** SPEC §7.2 (infantil sin documento): mismo nombre + apellido + fecha de nacimiento. */
  async buscarPorNombreYNacimiento(
    idFisioterapeuta: string,
    nombre: string,
    apellido: string,
    fechaNacimiento: string,
  ): Promise<HistoriaConRepresentante[]> {
    return this.prisma.historiaClinica.findMany({
      where: {
        idFisioterapeuta,
        nombre: { equals: nombre, mode: 'insensitive' },
        apellido: { equals: apellido, mode: 'insensitive' },
        fechaNacimiento: aFechaBd(fechaNacimiento),
      },
      include: INCLUIR,
      orderBy: { fechaActualizacion: 'desc' },
    });
  }

  /**
   * Crea la historia en Borrador. Sin `idPaciente`, crea también el paciente
   * ancla en la misma transacción.
   */
  async crear(
    idFisioterapeuta: string,
    idPaciente: string | null,
    tipo: TipoHistoria,
    datos: DatosPersonales,
    representante: DatosRepresentante | null = null,
  ): Promise<HistoriaConRepresentante> {
    return this.prisma.$transaction(async (tx) => {
      const paciente =
        idPaciente ?? (await tx.paciente.create({ data: { idFisioterapeuta } })).idPaciente;
      return tx.historiaClinica.create({
        data: {
          ...aColumnas(datos),
          tipo,
          idPaciente: paciente,
          idFisioterapeuta,
          ...(representante
            ? { representante: { create: aColumnasRepresentante(representante) } }
            : {}),
        },
        include: INCLUIR,
      });
    });
  }

  async buscarPorId(
    idFisioterapeuta: string,
    idHistoria: string,
  ): Promise<HistoriaConRepresentante | null> {
    return this.prisma.historiaClinica.findFirst({
      where: { idHistoria, idFisioterapeuta },
      include: INCLUIR,
    });
  }

  /** Las demás historias del mismo paciente (sin la indicada). */
  async listarOtrasDelPaciente(
    idFisioterapeuta: string,
    idPaciente: string,
    excluirIdHistoria: string,
  ): Promise<HistoriaDelPaciente[]> {
    return this.prisma.historiaClinica.findMany({
      where: { idFisioterapeuta, idPaciente, idHistoria: { not: excluirIdHistoria } },
      select: { idHistoria: true, tipo: true, estado: true, archivada: true },
      orderBy: { fechaCreacion: 'asc' },
    });
  }

  async listar(
    idFisioterapeuta: string,
    filtros: FiltrosHistorias,
  ): Promise<{ datos: HistoriaConRepresentante[]; total: number }> {
    const where: Prisma.HistoriaClinicaWhereInput = {
      idFisioterapeuta,
      archivada: filtros.archivadas,
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.estado ? { estado: filtros.estado } : {}),
      ...(filtros.creadaDesde || filtros.creadaHasta
        ? {
            fechaCreacion: {
              ...(filtros.creadaDesde ? { gte: aFechaBd(filtros.creadaDesde)! } : {}),
              // Inclusivo: hasta el final del día indicado.
              ...(filtros.creadaHasta
                ? { lt: new Date(aFechaBd(filtros.creadaHasta)!.getTime() + 86_400_000) }
                : {}),
            },
          }
        : {}),
      // Cada palabra debe coincidir con el nombre, el apellido o la cédula.
      AND: (filtros.texto?.split(/\s+/) ?? []).map((termino) => {
        const digitos = termino.replace(/\D/g, '');
        return {
          OR: [
            { nombre: { contains: termino, mode: 'insensitive' as const } },
            { apellido: { contains: termino, mode: 'insensitive' as const } },
            ...(digitos ? [{ cedula: { contains: digitos } }] : []),
          ],
        };
      }),
    };

    const [datos, total] = await Promise.all([
      this.prisma.historiaClinica.findMany({
        where,
        include: INCLUIR,
        orderBy: { fechaActualizacion: 'desc' },
        skip: (filtros.pagina - 1) * filtros.porPagina,
        take: filtros.porPagina,
      }),
      this.prisma.historiaClinica.count({ where }),
    ]);
    return { datos, total };
  }

  /** Conteos de las pestañas Historias / Archivadas, sin filtros. */
  async contar(idFisioterapeuta: string): Promise<{ historias: number; archivadas: number }> {
    const [historias, archivadas] = await Promise.all([
      this.prisma.historiaClinica.count({ where: { idFisioterapeuta, archivada: false } }),
      this.prisma.historiaClinica.count({ where: { idFisioterapeuta, archivada: true } }),
    ]);
    return { historias, archivadas };
  }
}
