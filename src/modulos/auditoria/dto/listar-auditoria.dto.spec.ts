import { randomUUID } from 'node:crypto';
import { esquemaListarAuditoria } from './listar-auditoria.dto.js';

describe('esquemaListarAuditoria', () => {
  it('aplica los valores por defecto de paginación', () => {
    const resultado = esquemaListarAuditoria.parse({});
    expect(resultado.pagina).toBe(1);
    expect(resultado.porPagina).toBe(20);
  });

  it('acepta filtros válidos, incluidas fechas ISO', () => {
    const resultado = esquemaListarAuditoria.safeParse({
      tipoEvento: 'inicio_sesion',
      resultado: 'FALLIDO',
      idUsuario: randomUUID(),
      desde: '2026-01-01T00:00:00Z',
      hasta: '2026-01-31T23:59:59Z',
      pagina: '2',
      porPagina: '10',
    });
    expect(resultado.success).toBe(true);
  });

  it('rechaza una fecha que no es ISO 8601', () => {
    expect(esquemaListarAuditoria.safeParse({ desde: '01/11/2026' }).success).toBe(false);
  });

  it('rechaza un idUsuario que no es UUID', () => {
    expect(esquemaListarAuditoria.safeParse({ idUsuario: 'no-es-uuid' }).success).toBe(false);
  });

  it('rechaza porPagina mayor a 100', () => {
    expect(esquemaListarAuditoria.safeParse({ porPagina: 101 }).success).toBe(false);
  });
});
