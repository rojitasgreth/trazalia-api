import { z } from 'zod';

const esquemaEntorno = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PUERTO: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Origen público del frontend: se usa para CORS y para validar Origin (DP-08).
  ORIGEN_WEB: z.url(),
  ZONA_HORARIA_NEGOCIO: z.string().default('America/Caracas'),

  // Claves EdDSA (Ed25519) para JWT, DP-11: JWK en base64url. Generar con
  // `npm run jwt:generar-claves`.
  JWT_ACCESS_CLAVE_PRIVADA: z.string().min(1),
  JWT_ACCESS_CLAVE_PUBLICA: z.string().min(1),
  JWT_REFRESH_CLAVE_PRIVADA: z.string().min(1),
  JWT_REFRESH_CLAVE_PUBLICA: z.string().min(1),
});

export type Entorno = z.infer<typeof esquemaEntorno>;

/** Valida las variables de entorno al arrancar; un valor inválido detiene el proceso. */
export function validarEntorno(variables: Record<string, unknown>): Entorno {
  const resultado = esquemaEntorno.safeParse(variables);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración de entorno inválida: ${detalle}`);
  }
  return resultado.data;
}
