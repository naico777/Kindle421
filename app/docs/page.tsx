export default function DocsPage() {
  return (
    <main className="page">
      <section className="panel stack">
        <h1 className="section-title">Cómo funciona</h1>
        <p className="lead">
          Kindle421 es una beta gratuita y liviana para recibir una edición diaria de 421.news en Kindle.
        </p>
        <div className="grid">
          <article>
            <h2>1. Fuente</h2>
            <p className="muted">
              Solo usamos el RSS público en español de 421.news. El contenido sale de `content:encoded`; no hacemos
              scraping de artículos originales.
            </p>
          </article>
          <article>
            <h2>2. Edición</h2>
            <p className="muted">
              A las 06:00 de Argentina, si hay artículos nuevos, generamos un EPUB con portada fija, índice y capítulos
              ordenados del más nuevo al más viejo.
            </p>
          </article>
          <article>
            <h2>3. Entrega</h2>
            <p className="muted">
              Enviamos el EPUB a tu dirección @kindle.com. No necesitás crear cuenta; tenés que autorizar manualmente
              el remitente en Amazon.
            </p>
          </article>
        </div>
        <p className="notice">
          Limitación explícita de v1: Kindle421 no puede garantizar que Amazon/Kindle reemplace la edición anterior.
          Puede aparecer una nueva entrega junto a versiones previas.
        </p>
      </section>
    </main>
  );
}
