import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

// Único lugar fuera de los repositorios que conoce el tipo de error de
// Prisma: expone un predicado plano para que los casos de uso no importen
// nada de Prisma directamente.
export function esConflictoDeUnicidad(error: unknown): boolean {
  return error instanceof PrismaClientKnownRequestError && error.code === 'P2002';
}
