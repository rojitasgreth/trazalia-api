import { exportJWK, generateKeyPair } from 'jose';
import type { ConfigService } from '@nestjs/config';
import { JwtServicio } from './jwt.servicio.js';

async function crearClaveBase64Url(): Promise<{ privada: string; publica: string }> {
  const { privateKey, publicKey } = await generateKeyPair('EdDSA', {
    crv: 'Ed25519',
    extractable: true,
  });
  const codificar = (jwk: unknown) =>
    Buffer.from(JSON.stringify(jwk), 'utf8').toString('base64url');
  return {
    privada: codificar(await exportJWK(privateKey)),
    publica: codificar(await exportJWK(publicKey)),
  };
}

async function crearServicio(): Promise<JwtServicio> {
  const acceso = await crearClaveBase64Url();
  const renovacion = await crearClaveBase64Url();
  const valores: Record<string, string> = {
    JWT_ACCESS_CLAVE_PRIVADA: acceso.privada,
    JWT_ACCESS_CLAVE_PUBLICA: acceso.publica,
    JWT_REFRESH_CLAVE_PRIVADA: renovacion.privada,
    JWT_REFRESH_CLAVE_PUBLICA: renovacion.publica,
  };
  const config = { get: (clave: string) => valores[clave] } as unknown as ConfigService<
    never,
    true
  >;
  return new JwtServicio(config);
}

describe('JwtServicio', () => {
  it('firma y verifica un token de acceso', async () => {
    const jwt = await crearServicio();
    const firmado = await jwt.firmarAcceso({
      sub: 'usuario-1',
      role: 'FISIOTERAPEUTA',
      sid: 'sesion-1',
    });

    const verificado = await jwt.verificarAcceso(firmado.token);

    expect(verificado.claims).toMatchObject({
      sub: 'usuario-1',
      role: 'FISIOTERAPEUTA',
      sid: 'sesion-1',
    });
    expect(verificado.jti).toBe(firmado.jti);
  });

  it('firma y verifica un token de renovación', async () => {
    const jwt = await crearServicio();
    const firmado = await jwt.firmarRenovacion({ sub: 'usuario-1', sid: 'sesion-1' });

    const verificado = await jwt.verificarRenovacion(firmado.token);

    expect(verificado.claims).toMatchObject({ sub: 'usuario-1', sid: 'sesion-1' });
  });

  it('rechaza un token de acceso presentado como renovación y viceversa', async () => {
    const jwt = await crearServicio();
    const acceso = await jwt.firmarAcceso({ sub: 'u', role: 'ADMINISTRADOR', sid: 's' });
    const renovacion = await jwt.firmarRenovacion({ sub: 'u', sid: 's' });

    await expect(jwt.verificarRenovacion(acceso.token)).rejects.toThrow();
    await expect(jwt.verificarAcceso(renovacion.token)).rejects.toThrow();
  });

  it('rechaza un token firmado con otra clave', async () => {
    const jwt = await crearServicio();
    const otro = await crearServicio();
    const firmado = await otro.firmarAcceso({ sub: 'u', role: 'ADMINISTRADOR', sid: 's' });

    await expect(jwt.verificarAcceso(firmado.token)).rejects.toThrow();
  });

  it('rechaza un token manipulado', async () => {
    const jwt = await crearServicio();
    const firmado = await jwt.firmarAcceso({ sub: 'u', role: 'ADMINISTRADOR', sid: 's' });
    const manipulado = `${firmado.token.slice(0, -2)}xx`;

    await expect(jwt.verificarAcceso(manipulado)).rejects.toThrow();
  });
});
