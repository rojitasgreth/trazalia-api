import { Module } from '@nestjs/common';
import { CorreoServicio } from './correo.servicio.js';

@Module({
  providers: [CorreoServicio],
  exports: [CorreoServicio],
})
export class CorreoModule {}
