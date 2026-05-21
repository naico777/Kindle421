export default function DocsPage() {
  return (
    <main className="page">
      <section className="panel stack">
        <h1 className="section-title">Cómo funciona</h1>
        <p className="lead">
          Kindle421 es una beta gratuita para recibir la Revista 421 mensual en Kindle, adaptada a EPUB.
        </p>
        <div className="grid">
          <article>
            <h2>1. Fuente</h2>
            <p className="muted">
              Usamos el PDF oficial de cada especial mensual de Revista 421. En v1 la carga es manual para poder revisar
              la adaptación antes de enviarla.
            </p>
          </article>
          <article>
            <h2>2. Edición</h2>
            <p className="muted">
              El admin prepara un texto adaptado, genera un EPUB con portada, índice y capítulos, y se envía una prueba
              antes de publicar.
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
          Cada número mensual llega como un libro/documento nuevo en Kindle. A diferencia del experimento diario, esto
          es parte del producto: cada revista es una edición independiente.
        </p>
      </section>
    </main>
  );
}
