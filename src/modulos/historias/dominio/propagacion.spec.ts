import { datosCarlos } from '../pruebas/fabricas.js';
import { camposCambiados, cambiosParaOtraHistoria } from './propagacion.js';

describe('propagación de datos personales (SPEC §10.2, ADR-0002)', () => {
  it('detecta solo los campos compartidos que cambiaron', () => {
    const antes = datosCarlos();
    const despues = datosCarlos({
      telefono: '04245558890',
      demandasFisicas: 'Otra cosa',
      fuenteInformacion: ['Paciente'],
    });

    // Demandas físicas y fuente de información no se comparten.
    expect(camposCambiados(antes, despues)).toEqual(['telefono']);
  });

  it('a otra historia solo llegan los campos que existen en su ficha', () => {
    const datos = datosCarlos({ telefono: '04245558890', dirEstado: 'Miranda' });

    expect(
      cambiosParaOtraHistoria(['telefono', 'dirEstado', 'nombre'], datos, {
        tipo: 'NEURO_ADULTO',
        sinDocumento: false,
      }),
    ).toEqual({ telefono: '04245558890', nombre: 'Carlos' });
    expect(
      cambiosParaOtraHistoria(['dirEstado'], datos, { tipo: 'ADULTO_MAYOR', sinDocumento: false }),
    ).toEqual({ dirEstado: 'Miranda' });
  });

  it('el documento se copia completo y una historia "Sin documento" deja de serlo', () => {
    const datos = datosCarlos({ nacionalidad: 'E', cedula: '81234567' });

    expect(
      cambiosParaOtraHistoria(['cedula'], datos, { tipo: 'REHAB_INFANTIL', sinDocumento: true }),
    ).toEqual({ nacionalidad: 'E', cedula: '81234567', sinDocumento: false });
  });

  it('no deja a un adulto con nacionalidad pendiente (RF-025)', () => {
    const datos = datosCarlos({ nacionalidad: null, cedula: '81234567' });

    expect(
      cambiosParaOtraHistoria(['nacionalidad'], datos, {
        tipo: 'TRAUMA_ADULTO',
        sinDocumento: false,
      }),
    ).toEqual({});
    // En infantil la nacionalidad puede quedar pendiente.
    expect(
      cambiosParaOtraHistoria(['nacionalidad'], datos, {
        tipo: 'REHAB_INFANTIL',
        sinDocumento: false,
      }),
    ).toEqual({ nacionalidad: null, cedula: '81234567' });
  });

  it('v1.4: la dirección llega a Traumatología solo si se atiende a domicilio', () => {
    const datos = datosCarlos({ dirEstado: 'Miranda' });
    expect(
      cambiosParaOtraHistoria(['dirEstado'], datos, {
        tipo: 'TRAUMA_ADULTO',
        sinDocumento: false,
        modalidad: 'DOMICILIO',
      }),
    ).toEqual({ dirEstado: 'Miranda' });
    expect(
      cambiosParaOtraHistoria(['dirEstado'], datos, {
        tipo: 'TRAUMA_ADULTO',
        sinDocumento: false,
        modalidad: 'CENTRO',
      }),
    ).toEqual({});
  });

  it('la modalidad y el centro no se propagan', () => {
    expect(
      camposCambiados(datosCarlos(), datosCarlos({ modalidad: 'DOMICILIO', idCentro: null })),
    ).toEqual([]);
  });
});
