import { SetMetadata } from '@nestjs/common';
import type { RolUsuario } from '../../../generado/prisma/enums.js';

export const ROLES_CLAVE = 'roles';

/** Requiere que el handler use @UseGuards(AutenticacionGuard, RolesGuard). */
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_CLAVE, roles);
