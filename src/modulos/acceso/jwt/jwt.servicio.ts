import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { importJWK, jwtVerify, SignJWT, type CryptoKey, type JWTPayload } from 'jose';
import type { Entorno } from '../../../configuracion/entorno.js';
import type { RolUsuario } from '../../../generado/prisma/enums.js';

// DP-11: EdDSA (Ed25519), claves separadas para access y refresh.
const EMISOR = 'trazalia-api';
const AUDIENCIA = 'trazalia-web';
// DP-01/DP-02.
const VIDA_ACCESO_SEGUNDOS = 30 * 60;
const VIDA_RENOVACION_SEGUNDOS = 7 * 24 * 60 * 60;

export interface ClaimsAcceso {
  sub: string;
  role: RolUsuario;
  sid: string;
}

export interface ClaimsRenovacion {
  sub: string;
  sid: string;
}

export interface TokenFirmado {
  token: string;
  jti: string;
  expira: Date;
}

export interface TokenVerificado<T> {
  claims: T;
  jti: string;
  expira: Date;
}

class TokenInvalidoError extends Error {}

function decodificarJwk(valorBase64Url: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(valorBase64Url, 'base64url').toString('utf8'));
}

@Injectable()
export class JwtServicio {
  private readonly claves: Promise<{
    privadaAcceso: CryptoKey;
    publicaAcceso: CryptoKey;
    privadaRenovacion: CryptoKey;
    publicaRenovacion: CryptoKey;
  }>;

  constructor(config: ConfigService<Entorno, true>) {
    this.claves = this.cargarClaves(config);
  }

  private async cargarClaves(config: ConfigService<Entorno, true>) {
    const importar = (variable: keyof Entorno) =>
      importJWK(
        decodificarJwk(config.get(variable, { infer: true }) as string),
        'EdDSA',
      ) as Promise<CryptoKey>;

    const [privadaAcceso, publicaAcceso, privadaRenovacion, publicaRenovacion] = await Promise.all([
      importar('JWT_ACCESS_CLAVE_PRIVADA'),
      importar('JWT_ACCESS_CLAVE_PUBLICA'),
      importar('JWT_REFRESH_CLAVE_PRIVADA'),
      importar('JWT_REFRESH_CLAVE_PUBLICA'),
    ]);
    return { privadaAcceso, publicaAcceso, privadaRenovacion, publicaRenovacion };
  }

  async firmarAcceso(claims: ClaimsAcceso): Promise<TokenFirmado> {
    const { privadaAcceso } = await this.claves;
    return this.firmar(privadaAcceso, { ...claims, typ: 'access' }, VIDA_ACCESO_SEGUNDOS);
  }

  async firmarRenovacion(claims: ClaimsRenovacion): Promise<TokenFirmado> {
    const { privadaRenovacion } = await this.claves;
    return this.firmar(privadaRenovacion, { ...claims, typ: 'refresh' }, VIDA_RENOVACION_SEGUNDOS);
  }

  async verificarAcceso(token: string): Promise<TokenVerificado<ClaimsAcceso>> {
    const { publicaAcceso } = await this.claves;
    return this.verificar<ClaimsAcceso>(token, publicaAcceso, 'access');
  }

  async verificarRenovacion(token: string): Promise<TokenVerificado<ClaimsRenovacion>> {
    const { publicaRenovacion } = await this.claves;
    return this.verificar<ClaimsRenovacion>(token, publicaRenovacion, 'refresh');
  }

  private async firmar(
    clavePrivada: CryptoKey,
    claims: Record<string, unknown>,
    vidaSegundos: number,
  ): Promise<TokenFirmado> {
    const jti = randomUUID();
    const ahora = Math.floor(Date.now() / 1000);
    const expira = ahora + vidaSegundos;
    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'EdDSA' })
      .setIssuer(EMISOR)
      .setAudience(AUDIENCIA)
      .setIssuedAt(ahora)
      .setExpirationTime(expira)
      .setJti(jti)
      .sign(clavePrivada);
    return { token, jti, expira: new Date(expira * 1000) };
  }

  private async verificar<T>(
    token: string,
    clavePublica: CryptoKey,
    tipoEsperado: 'access' | 'refresh',
  ): Promise<TokenVerificado<T>> {
    const { payload } = await jwtVerify(token, clavePublica, {
      algorithms: ['EdDSA'],
      issuer: EMISOR,
      audience: AUDIENCIA,
      requiredClaims: ['exp', 'iat', 'jti', 'sub', 'sid'],
    });
    if (payload.typ !== tipoEsperado) {
      throw new TokenInvalidoError('Tipo de token incorrecto');
    }
    return this.extraerClaims<T>(payload);
  }

  private extraerClaims<T>(payload: JWTPayload): TokenVerificado<T> {
    const { jti, exp, iat: _iat, iss: _iss, aud: _aud, typ: _typ, ...resto } = payload;
    return { claims: resto as T, jti: jti as string, expira: new Date((exp as number) * 1000) };
  }
}
