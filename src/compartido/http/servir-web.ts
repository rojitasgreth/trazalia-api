import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

// Entorno de calidad (Render): la API sirve también la web compilada, para que
// las dos compartan dominio y las cookies SameSite=Lax funcionen (DP-08). Repite
// las reglas de trazalia-web/docker/nginx.conf, que se usa cuando hay proxy propio.

const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
} as const;

function esDeLaApi(req: Request): boolean {
  return req.path === '/api' || req.path.startsWith('/api/');
}

/**
 * Sirve los archivos de Angular de `carpeta` fuera de `/api`: los que llevan
 * hash con caché larga y cualquier otra ruta de navegación con `index.html`
 * (las rutas de la SPA). Debe registrarse antes de `configurarAplicacion`, para
 * que la política de seguridad de la API no se aplique a la web.
 */
export function servirWeb(app: NestExpressApplication, carpeta: string): void {
  const indice = join(carpeta, 'index.html');

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!esDeLaApi(req)) {
      for (const [nombre, valor] of Object.entries(CABECERAS)) res.setHeader(nombre, valor);
    }
    next();
  });
  app.useStaticAssets(carpeta, {
    index: false,
    setHeaders: (res, ruta) => {
      res.setHeader(
        'Cache-Control',
        ruta.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
      );
    },
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const esNavegacion = (req.method === 'GET' || req.method === 'HEAD') && req.accepts('html');
    if (esDeLaApi(req) || !esNavegacion) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indice);
  });
}
