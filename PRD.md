# PRD: Kindle421 v1

## Resumen
`Kindle421` es un servicio beta gratuito que permite a usuarios recibir una edición diaria de `421.news` en su Kindle, optimizada para lectura e-ink y entregada por email a la dirección `@kindle.com`. La v1 está enfocada solo en el feed público en español de `421.news`, con onboarding simple, operación liviana y una superficie admin mínima.

Éxito en v1:
- Un usuario puede registrarse, configurar su email de Kindle y empezar a recibir ediciones diarias sin intervención manual.
- El sistema envía una edición diaria solo cuando hay artículos nuevos.
- La edición llega con formato limpio, legible y consistente en Kindle.
- El sistema permite a un operador ver usuarios, estado de conexión y últimos fallos.

## Cambios e Interfaces Clave

### Producto y UX
- Branding del producto: `Kindle421`.
- Idioma de interfaz y emails: español.
- Público objetivo: pocos usuarios beta con registro abierto.
- Propuesta del producto: herramienta de uso personal asistido sobre el feed público de `421.news`.
- Onboarding:
  - formulario simple de alta;
  - usuario carga su email, su dirección `@kindle.com` y acepta una checklist guiada;
  - la checklist explica cómo autorizar el remitente en Amazon y cómo encontrar la dirección Kindle;
  - no hay verificación activa en v1 antes de habilitar el envío.

### Edición diaria
- Fuente única: `https://www.421.news/es/rss/`.
- Solo se usa el contenido del RSS en español.
- El contenido del EPUB se construye desde `content:encoded` del feed, sin scraping del artículo original.
- Se genera una edición diaria con todos los artículos nuevos desde la última ejecución exitosa.
- Orden de artículos: del más nuevo al más viejo.
- Estilo editorial:
  - minimalista;
  - portada fija simple;
  - subtítulo o metadata interna con la fecha de edición;
  - índice al inicio;
  - un artículo por capítulo;
  - HTML saneado para Kindle, con imágenes conservadas solo si no degradan legibilidad.
- Si no hay artículos nuevos, no se genera ni se envía edición.

### Entrega y scheduling
- Método de entrega v1: email al `@kindle.com` del usuario.
- Horario de envío: `06:00` hora de Argentina.
- Zona horaria v1: fija en Argentina para todos los usuarios.
- Política de fallos:
  - reintentos automáticos ante fallos transitorios de envío;
  - si agota reintentos, marcar fallo y notificar por email.
- Limitación explícita del producto:
  - v1 no garantiza reemplazar la edición anterior dentro de Kindle;
  - el sistema envía una nueva edición, pero la visibilidad de una o varias versiones depende del comportamiento de Amazon/Kindle.

### Backend y datos
- Arquitectura: app web pequeña `serverless + DB`.
- Estado persistido por usuario:
  - email de registro;
  - dirección `@kindle.com`;
  - estado de onboarding;
  - preferencias mínimas necesarias;
  - último artículo enviado o último `pubDate/guid` procesado;
  - hash o fingerprint de la última edición para evitar reenvíos duplicados;
  - timestamps de último envío exitoso y último fallo.
- Retención:
  - guardar mínimo de datos;
  - no guardar histórico completo de ediciones;
  - conservar solo la última edición generada o referencia operativa equivalente.
- Persistencia de archivos:
  - no versionar ediciones en repo;
  - no mantener biblioteca histórica de EPUBs en v1.

### Admin y operación
- Admin surface mínima:
  - listar usuarios;
  - ver estado de conexión/configuración;
  - ver último envío, último fallo y estado actual;
  - identificar usuarios con entregas fallidas.
- Protección básica antiabuso:
  - rate limiting;
  - captcha en registro;
  - topes simples por usuario/día;
  - validación de formato de emails.
- Sin billing en v1.
- Riesgo/deuda aceptada:
  - `registro abierto + sin verificación previa` puede aumentar configuraciones erróneas y tasa de fallo.

## Implementación

### Subsystems
- `frontend web`
  - landing simple de producto;
  - formulario de alta;
  - pantalla/checklist de onboarding;
  - confirmación de estado del usuario.
- `job scheduler`
  - corrida diaria a las `06:00 America/Argentina/Buenos_Aires`;
  - barrido de usuarios activos.
- `feed ingestion`
  - fetch del RSS;
  - parseo de items;
  - deduplicación por `guid` y/o `pubDate + link`;
  - selección de artículos no enviados.
- `edition builder`
  - limpieza del HTML del RSS;
  - armado de portada, TOC y capítulos;
  - generación de `EPUB` compatible con Kindle.
- `delivery service`
  - envío SMTP/email;
  - reintentos automáticos;
  - registro de éxito/fallo.
- `admin`
  - vista mínima protegida para operador.

### Interfaces públicas esperadas
- Alta de usuario:
  - input: email del usuario, email Kindle, consentimiento básico.
  - output: usuario creado con estado de onboarding.
- Estado del usuario:
  - input: identidad del usuario autenticado.
  - output: configuración, estado de onboarding, último envío, último error.
- Job diario:
  - input: usuarios activos.
  - output: envíos realizados, omitidos por falta de novedades, y fallidos.
- Admin list:
  - output: tabla resumida de usuarios y salud operativa.

### Defaults cerrados
- Un solo feed soportado en v1.
- Un solo país/idioma operativo en v1.
- Sin multi-feed, sin multi-tenant complejo, sin personalización editorial avanzada.
- Sin scraping de artículos, sin app móvil, sin reemplazo real de documentos previos en Kindle.

## Test Plan

### Casos funcionales
- Usuario nuevo completa alta con email normal y email Kindle válido.
- Usuario activo con artículos nuevos recibe una edición diaria.
- Usuario activo sin artículos nuevos no recibe email.
- Dos corridas seguidas sin cambios no duplican envíos.
- Artículos del RSS se renderizan en EPUB con índice, capítulos y orden correcto.
- El EPUB resultante abre correctamente en un flujo compatible con Kindle.

### Casos de fallo
- Fallo temporal al leer RSS dispara reintentos y no corrompe estado.
- Fallo temporal de SMTP dispara reintentos y luego marca error si no se recupera.
- Email Kindle mal configurado produce fallo visible para usuario/admin.
- HTML problemático en un artículo no rompe toda la edición; se sanea o se omite de forma controlada.
- Un usuario con estado incompleto no entra al job de envío.

### Escenarios de producto
- Onboarding guiado deja claro que Amazon requiere autorización manual del remitente.
- La UI comunica explícitamente que Kindle puede mostrar varias entregas y que v1 no controla el reemplazo remoto.
- Admin puede identificar rápidamente usuarios sanos, usuarios sin configurar y usuarios con fallos recientes.

## Supuestos
- `421.news` mantiene disponible el RSS público en español con contenido suficiente en `content:encoded`.
- Amazon sigue permitiendo entrega por email a Kindle en el flujo estándar del usuario.
- La v1 se lanza como beta chica para decenas de usuarios, no para escala masiva.
- La restricción de “una sola versión visible” queda fuera de alcance de v1 y documentada como limitación del ecosistema Kindle.
- La autenticación de usuarios puede ser básica, suficiente para una beta abierta con protección mínima.
