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

Creá `.env.local` a partir de `.env.example`:

```bash
cp .env.example .env.local
```

Para desarrollo, cambiá `NEXT_PUBLIC_SITE_URL` a `http://localhost:3000`.

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

Para conservar imágenes internas del PDF en la versión e-reader:

```bash
node scripts/extract-pdf-images.mjs ~/Downloads/14_abril.pdf tmp/revista-421-14-images > tmp/revista-421-14-images.json
node scripts/extract-pdf-links.mjs ~/Downloads/14_abril.pdf > tmp/revista-421-14-links.json
node scripts/pdf-to-magazine-text.mjs ~/Downloads/14_abril.pdf --images=tmp/revista-421-14-images.json --links=tmp/revista-421-14-links.json > tmp/revista-421-14-con-imagenes.txt
node scripts/build-magazine-epub.mjs tmp/revista-421-14-con-imagenes.txt tmp/revista-421-14-preview.epub --title="421 #14: Especial Inteligencia Artificial (Abril '26)" --issue=14 --cover=tmp/revista-421-14-cover.jpg
```

El texto soporta imágenes en formato Markdown, por ejemplo `![Caption](https://...)`. Para envíos desde Vercel, esas imágenes deben usar URLs públicas; para previews locales también pueden apuntar a archivos locales generados en `tmp/`.

Cada nota se renderiza con una página de presentación: primera imagen detectada, autor, título y bajada. El cuerpo empieza en la página siguiente. El texto adaptado también soporta Markdown inline para preservar edición básica: `**negrita**`, `*cursiva*` y `[texto linkeado](https://...)`.

## Admin

El admin mínimo está en:

```text
/admin?key=$CRON_SECRET
```

Permite cargar números, enviar pruebas, publicar a suscriptores y ver suscripciones/fallos. Es deliberadamente simple para beta chica.
Tratamos `CRON_SECRET` como una contraseña: no lo compartas públicamente y rotalo si se filtra.

## Automatización

La v1 no tiene cron de envío mensual. La publicación es manual desde el admin para poder revisar el EPUB de prueba antes
de enviarlo a todos los suscriptores.

## Deploy en Vercel

1. Cargá las mismas variables de entorno en Vercel.
2. Asegurate de que `NEXT_PUBLIC_SITE_URL` apunte al dominio productivo.
3. Para Kindle real necesitás un dominio verificado en Resend y autorizar ese remitente en Amazon.
4. Ejecutá `supabase/schema.sql` en la base productiva antes del primer envío.

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
