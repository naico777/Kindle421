# Kindle421

Kindle421 es una beta gratuita para recibir la Revista 421 mensual en Kindle. La v1 carga manualmente cada PDF oficial, genera una adaptación EPUB minimalista y la envía al `@kindle.com` de cada suscriptor.

## Stack

- Next.js + TypeScript
- Supabase Postgres como base de datos
- Resend para emails
- Vercel para frontend y admin

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

## Flujo editorial mensual

- El admin entra a `/admin?key=$CRON_SECRET`.
- Pega el texto adaptado del número mensual. Para separar capítulos usa líneas `# Título`.
- Guarda el número en `public.magazine_issues`.
- Envía una prueba a un Kindle.
- Cuando la prueba está aprobada, envía el número a todos los suscriptores.
- Cada entrega queda registrada en `public.magazine_deliveries`.

Para extraer un borrador local desde PDF:

```bash
node scripts/pdf-to-magazine-text.mjs ~/Downloads/14_abril.pdf > abril-2026.txt
```

Ese texto se revisa manualmente antes de pegarlo en el admin.

## Admin

El admin mínimo está en:

```text
/admin?key=$CRON_SECRET
```

Permite cargar números, enviar pruebas, publicar a suscriptores y ver suscripciones/fallos. Es deliberadamente simple para beta chica.

## Deploy en Vercel

1. Cargá las mismas variables de entorno en Vercel.
2. Asegurate de que `NEXT_PUBLIC_SITE_URL` apunte al dominio productivo.
3. Para Kindle real necesitás un dominio verificado en Resend y autorizar ese remitente en Amazon.

## Comportamiento Kindle

Kindle421 envía cada número mensual como un EPUB nuevo. Amazon/Kindle lo muestra como un libro/documento independiente, que es el comportamiento esperado para una revista mensual.

## Datos persistidos

La tabla `subscriptions` guarda solo lo mínimo:

- dirección `@kindle.com`;
- estado de envío;
- números de revista y texto fuente adaptado;
- entregas por número/suscriptor;
- fingerprint de última edición enviada;
- último envío exitoso;
- último fallo.

No se versionan EPUBs en el repo. El PDF original no se sube todavía a storage en v1; se guarda el texto adaptado.
