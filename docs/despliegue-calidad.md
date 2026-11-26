# Entorno de calidad: Render + Neon + Brevo (gratis)

Una sola aplicación en Render sirve la API y la web en el mismo dominio
(`Dockerfile.calidad`). La base de datos está en Neon, el correo sale por Brevo y
un ping de cron-job.org cada 10 minutos evita que Render la duerma.

| Pieza                 | Plan gratis       | Límite que importa                                                                                              |
| --------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Render (servicio web) | 512 MB, 0,1 CPU   | Se duerme tras 15 min sin tráfico; 750 h/mes (un servicio despierto todo el mes usa 744 h); 5 GB de tráfico/mes |
| Neon (PostgreSQL)     | 1 GB por proyecto | 100 horas de cómputo/mes; se suspende tras 5 min sin uso y despierta sola                                       |
| Brevo (SMTP)          | 300 correos/día   | Remitente verificado                                                                                            |
| cron-job.org          | Gratis            | —                                                                                                               |

> Es un entorno de **pruebas con datos falsos**, no de producción. La migración
> `20261123000000_datos_de_prueba` carga los usuarios de prueba (con los mismos
> correos y contraseñas que la base local). Antes de un despliegue real hay que
> retirarla.

## 0. Requisito: el código en `main`

Render construye la API desde la rama `main` de `trazalia-api`, y la imagen
descarga la web desde la rama `main` de `trazalia-web`. Lo que no esté subido a
`main` no llega a calidad.

## 1. Neon (base de datos)

1. Crea una cuenta en <https://neon.com> y un proyecto `trazalia-calidad` en la
   región **AWS US East (N. Virginia)**, la misma de Render.
2. En **Settings → Compute**, deja el tamaño en **0,25 CU** (mínimo y máximo).
3. **Roles → New role:** `trazalia_migrador`. Copia la contraseña que muestra.
4. **Databases → New database:** `trazalia`, con propietario `trazalia_migrador`.
5. **SQL Editor:** arriba elige la base `trazalia` y el rol `trazalia_migrador`.
   Pega `docker/neon/preparar-base.sql`, cambia `CAMBIA_ESTA_CONTRASENA` por una
   contraseña larga (guárdala: es la de `trazalia_app`) y ejecútalo.
6. **Connection details:** desactiva _Connection pooling_ y copia el host
   (`ep-…​.us-east-1.aws.neon.tech`). Arma las dos URL:

   ```
   DATABASE_URL_MIGRACIONES=postgresql://trazalia_migrador:CONTRASENA_MIGRADOR@HOST/trazalia?sslmode=require
   DATABASE_URL=postgresql://trazalia_app:CONTRASENA_APP@HOST/trazalia?sslmode=require
   ```

   Si una contraseña tiene símbolos como `@`, `:` o `/`, escríbelos codificados
   (`%40`, `%3A`, `%2F`).

## 2. Claves JWT

En tu máquina, dentro de `trazalia-api`:

```
npm run jwt:generar-claves
```

Copia los cuatro valores (`JWT_ACCESS_…` y `JWT_REFRESH_…`). Son solo para
calidad: no reutilices las de desarrollo.

## 3. Brevo (correo)

1. Crea una cuenta en <https://www.brevo.com>.
2. **Senders, domains & dedicated IPs → Senders → Add a sender:** el correo que
   firmará los mensajes. Verifícalo con el código que te llega.
3. **SMTP & API → SMTP:** copia el _Login_ (algo como `…@smtp-brevo.com`) y genera
   una _SMTP key_.

```
SMTP_USUARIO=<Login de Brevo>
SMTP_CONTRASENA=<SMTP key>
CORREO_REMITENTE=Trazalia <el-correo-verificado@ejemplo.com>
```

## 4. Render (aplicación)

1. Crea una cuenta en <https://render.com> entrando con GitHub.
2. **New → Blueprint** y elige el repositorio `trazalia-api`. Render lee
   `render.yaml` y crea el servicio `trazalia-calidad` en el plan gratis.
3. Te pedirá los secretos: las dos URL de Neon, las cuatro claves JWT, los tres
   datos de Brevo y `ORIGEN_WEB`. Para `ORIGEN_WEB` usa
   `https://trazalia-calidad.onrender.com`; si Render le pone otro nombre al
   servicio, corrígelo luego en **Environment** con la URL real (sin `/` al final).
4. El primer despliegue construye la web y la API (unos 10 minutos) y aplica las
   migraciones al arrancar.
5. Comprueba que `https://<tu-servicio>.onrender.com/api/v1/salud` responde
   `{"estado":"ok","baseDeDatos":"ok"}`.

## 5. cron-job.org (que no se duerma)

1. Crea una cuenta en <https://cron-job.org>.
2. **Create cronjob:** URL `https://<tu-servicio>.onrender.com/` (la página
   principal, **no** `/api/v1/salud`), cada **10 minutos**.
3. En **Notifications**, activa el aviso cuando falle.

El ping va a la página principal a propósito: no consulta la base, así Neon
puede dormirse cuando nadie usa la aplicación y no se agotan sus 100 horas.

## Qué esperar

- **Primera petición tras una pausa:** si el ping falló y Render se durmió,
  tarda ~1 minuto en responder. Si Neon estaba suspendida, la primera consulta
  tarda menos de un segundo de más.
- **Despliegues:** cada push a `main` de `trazalia-api` redespliega solo. Un
  cambio solo en `trazalia-web` necesita **Manual Deploy** en Render.
- **No corre en calidad:** el worker que archiva la auditoría cada semestre
  (Render gratis no tiene workers). No afecta a las pruebas.
- **Correo:** las invitaciones y la recuperación de contraseña salen por Brevo
  con TLS obligatorio.
