import type { ConfigService } from '@nestjs/config';
import type { CorreoServicio } from '../../../compartido/correo/correo.servicio.js';
import type { AuditoriaServicio } from '../../auditoria/auditoria.servicio.js';
import type { RecuperacionRepositorio } from '../repositorios/recuperacion.repositorio.js';
import type { UsuarioRepositorio } from '../repositorios/usuario.repositorio.js';
import { SolicitarRecuperacionCasoUso } from './solicitar-recuperacion.caso-uso.js';

const CONFIG_VALORES: Record<string, string> = {
  ORIGEN_WEB: 'http://localhost:4200',
  ZONA_HORARIA_NEGOCIO: 'America/Caracas',
};

function crearCasoUso(usuario: Record<string, unknown> | null) {
  const usuarios = {
    buscarPorIdentificador: vi.fn().mockResolvedValue(usuario),
  } as unknown as UsuarioRepositorio;
  const recuperaciones = {
    invalidarVigentesDeUsuario: vi.fn().mockResolvedValue(undefined),
    crear: vi.fn().mockResolvedValue(undefined),
  } as unknown as RecuperacionRepositorio;
  const correo = {
    enviarRecuperacion: vi.fn().mockResolvedValue(undefined),
  } as unknown as CorreoServicio;
  const auditoria = {
    registrar: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditoriaServicio;
  const config = { get: (clave: string) => CONFIG_VALORES[clave] } as unknown as ConfigService<
    never,
    true
  >;

  return {
    casoUso: new SolicitarRecuperacionCasoUso(usuarios, recuperaciones, correo, auditoria, config),
    recuperaciones,
    correo,
    auditoria,
  };
}

describe('SolicitarRecuperacionCasoUso', () => {
  it('genera y envía un enlace de recuperación para una cuenta ACTIVO (AC-012)', async () => {
    const { casoUso, recuperaciones, correo } = crearCasoUso({
      idUsuario: 'u1',
      estado: 'ACTIVO',
      correo: 'ana@b.com',
      nombre: 'Ana',
      nombreUsuario: 'V1',
    });

    await casoUso.ejecutar('ana@b.com');

    expect(recuperaciones.invalidarVigentesDeUsuario).toHaveBeenCalledWith('u1');
    expect(recuperaciones.crear).toHaveBeenCalledWith('u1', expect.any(String), expect.any(Date));
    expect(correo.enviarRecuperacion).toHaveBeenCalledWith(
      expect.objectContaining({ para: 'ana@b.com', usuario: 'V1' }),
    );
  });

  it('también permite recuperar una cuenta BLOQUEADO', async () => {
    const { casoUso, correo } = crearCasoUso({
      idUsuario: 'u1',
      estado: 'BLOQUEADO',
      correo: 'ana@b.com',
      nombre: 'Ana',
      nombreUsuario: 'V1',
    });

    await casoUso.ejecutar('ana@b.com');

    expect(correo.enviarRecuperacion).toHaveBeenCalledOnce();
  });

  it('no envía nada si el correo no existe, sin lanzar (AC-012: respuesta genérica)', async () => {
    const { casoUso, correo } = crearCasoUso(null);

    await expect(casoUso.ejecutar('nadie@b.com')).resolves.toBeUndefined();
    expect(correo.enviarRecuperacion).not.toHaveBeenCalled();
  });

  it.each(['PENDIENTE', 'SUSPENDIDO', 'INACTIVO'])(
    'no envía nada para una cuenta %s (no debe esquivar invitación ni suspensión administrativa)',
    async (estado) => {
      const { casoUso, correo } = crearCasoUso({
        idUsuario: 'u1',
        estado,
        correo: 'ana@b.com',
        nombre: 'Ana',
        nombreUsuario: 'V1',
      });

      await casoUso.ejecutar('ana@b.com');

      expect(correo.enviarRecuperacion).not.toHaveBeenCalled();
    },
  );
});
