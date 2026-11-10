import { validarEntorno } from './entorno.js';

const minimo = {
  DATABASE_URL: 'postgresql://trazalia_app:clave@localhost:5432/trazalia',
  ORIGEN_WEB: 'http://localhost:4200',
};

describe('validarEntorno', () => {
  it('aplica los valores por defecto', () => {
    const entorno = validarEntorno(minimo);

    expect(entorno.NODE_ENV).toBe('development');
    expect(entorno.PUERTO).toBe(3000);
    expect(entorno.ZONA_HORARIA_NEGOCIO).toBe('America/Caracas');
  });

  it('convierte el puerto a número', () => {
    expect(validarEntorno({ ...minimo, PUERTO: '8080' }).PUERTO).toBe(8080);
  });

  it('rechaza una URL de base de datos que no es PostgreSQL', () => {
    expect(() => validarEntorno({ ...minimo, DATABASE_URL: 'mysql://localhost/x' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rechaza la falta de variables obligatorias', () => {
    expect(() => validarEntorno({})).toThrow(/DATABASE_URL.*ORIGEN_WEB/);
  });
});
