# Kindle421

Kindle421 es una beta gratuita para recibir una edición diaria de `421.news` en Kindle. La v1 soporta solo el RSS público en español, genera un EPUB minimalista y lo envía al `@kindle.com` a las 06:00 hora Argentina.

## Stack

- Next.js + TypeScript
- Supabase Postgres como base de datos
- Resend para emails
- Vercel para frontend, admin y cron serverless

## Setup local

```bash
npm install
```

Creá `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
EMAIL_FROM="Kindle421 <envios@tu-dominio.com>"
CRON_SECRET=un-secreto-largo-de-al-menos-16-caracteres
CAPTCHA_SECRET=
NOTIFY_FAILURES_TO=ops@tu-dominio.com
```

Ejecutá `supabase/schema.sql` en Supabase SQL Editor y levantá la app:

```bash
npm run dev
```

## Flujo de cliente

- No hay cuenta, Google login ni magic link.
- El cliente deja solo su dirección `@kindle.com`.
- Debe autorizar manualmente el remitente `EMAIL_FROM` en Amazon.
- La app guarda una suscripción activa en `public.subscriptions`.

## Job diario

`GET /api/cron/daily`:

- Lee `https://www.421.news/es/rss/`.
- Usa `content:encoded` del feed, con `description` como fallback.
- Ordena artículos del más nuevo al más viejo.
- Selecciona artículos nuevos desde el último fingerprint enviado a cada suscripción.
- Si no hay novedades, no genera ni envía nada.
- Genera EPUB con portada, índice y capítulos.
- Envía por Resend con reintentos.
- Marca último éxito o último fallo visible para admin.

Invocación manual:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily
```

## Admin

El admin mínimo está en:

```text
/admin?key=$CRON_SECRET
```

Muestra suscripciones, estado, último envío y últimos fallos. Es deliberadamente simple para beta chica.

## Deploy en Vercel

1. Cargá las mismas variables de entorno en Vercel.
2. Asegurate de que `NEXT_PUBLIC_SITE_URL` apunte al dominio productivo.
3. `vercel.json` ejecuta `/api/cron/daily` todos los días a las `09:00 UTC`, equivalente a `06:00 America/Argentina/Buenos_Aires`.
4. Para Kindle real necesitás un dominio verificado en Resend y autorizar ese remitente en Amazon.

## Limitación Kindle

Kindle421 envía una nueva edición diaria. Amazon/Kindle no garantiza que esa entrega reemplace la edición anterior en la biblioteca del usuario. Esta limitación está documentada en la landing y docs.

## Datos persistidos

La tabla `subscriptions` guarda solo lo mínimo:

- dirección `@kindle.com`;
- estado de envío;
- último artículo/fingerprint procesado;
- fingerprint de última edición;
- último envío exitoso;
- último fallo.

No se versionan EPUBs en el repo ni se mantiene una biblioteca histórica de ediciones.
