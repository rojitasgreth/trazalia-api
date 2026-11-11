import { z } from 'zod';

const esquemaEntorno = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PUERTO: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Rol propietario de los esquemas (trazalia_migrador). La API nunca la usa
  // en tiempo de ejecución; solo el worker, para el archivo semestral de
  // auditoría (BR-038): auditoria_historico es inaccesible para trazalia_app.
  DATABASE_URL_MIGRACIONES: z.url({ protocol: /^postgres(ql)?$/ }),
  // Origen público del frontend: se usa para CORS y para validar Origin (DP-08).
  ORIGEN_WEB: z.url(),
  ZONA_HORARIA_NEGOCIO: z.string().default('America/Caracas'),

  // Claves EdDSA (Ed25519) para JWT, DP-11: JWK en base64url. Generar con
  // `npm run jwt:generar-claves`.
  JWT_ACCESS_CLAVE_PRIVADA: z.string().min(1),
  JWT_ACCESS_CLAVE_PUBLICA: z.string().min(1),
  JWT_REFRESH_CLAVE_PRIVADA: z.string().min(1),
  JWT_REFRESH_CLAVE_PUBLICA: z.string().min(1),

  // Correo saliente (invitaciones, Corte 3). En desarrollo apunta a Mailpit
  // (docker-compose), sin usuario/contraseña.
  SMTP_HOST: z.string().min(1).default('localhost'),
  SMTP_PUERTO: z.coerce.number().int().positive().default(1025),
  SMTP_USUARIO: z.string().optional(),
  SMTP_CONTRASENA: z.string().optional(),
  CORREO_REMITENTE: z.string().default('Trazalia <no-responder@trazalia.local>'),

  // Bloqueo por fuerza bruta (BR-035, DP-05: "ejemplo inicial... calibrar").
  BLOQUEO_UMBRAL_INTENTOS: z.coerce.number().int().positive().default(10),
  BLOQUEO_VENTANA_MINUTOS: z.coerce.number().int().positive().default(15),
  BLOQUEO_DURACION_MINUTOS: z.coerce.number().int().positive().default(15),

  // Rate limiting por IP (BR-035) en rutas públicas sensibles.
  RATE_LIMIT_VENTANA_SEGUNDOS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAXIMO: z.coerce.number().int().positive().default(20),
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
