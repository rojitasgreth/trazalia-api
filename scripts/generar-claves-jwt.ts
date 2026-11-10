import { exportJWK, generateKeyPair } from 'jose';

// Genera un par de claves EdDSA (Ed25519) nuevo para access y otro para refresh
// (DP-11), codificadas como JWK en base64url para pegar directo en el .env.
// Uso: npm run jwt:generar-claves

function codificar(jwk: unknown): string {
  return Buffer.from(JSON.stringify(jwk), 'utf8').toString('base64url');
}

async function generarPar(nombre: string): Promise<void> {
  const { privateKey, publicKey } = await generateKeyPair('EdDSA', {
    crv: 'Ed25519',
    extractable: true,
  });
  console.log(`${nombre}_PRIVADA=${codificar(await exportJWK(privateKey))}`);
  console.log(`${nombre}_PUBLICA=${codificar(await exportJWK(publicKey))}`);
}

await generarPar('JWT_ACCESS_CLAVE');
await generarPar('JWT_REFRESH_CLAVE');
