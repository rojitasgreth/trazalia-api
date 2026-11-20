import { Module } from '@nestjs/common';
import { RegistrosClinicosDeValoraciones } from './registros-clinicos-de-valoraciones.js';

// Parte de solo lectura del módulo valoraciones que necesita historias. Va
// aparte para que historias no dependa del módulo completo, que a su vez
// depende de historias.
@Module({
  providers: [RegistrosClinicosDeValoraciones],
  exports: [RegistrosClinicosDeValoraciones],
})
export class ValoracionesLecturaModule {}
