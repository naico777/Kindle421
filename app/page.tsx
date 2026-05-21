import Link from "next/link";
import { subscribeAction } from "@/app/actions";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ subscribed?: string; error?: string; test?: string }> }) {
  const params = await searchParams;

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Revista mensual · Optimizada para e-reader</p>
          <h1>La Revista 421 en tu Kindle.</h1>
          <p className="lead">
            Recibí cada especial mensual de 421.news como un libro nuevo en tu Kindle: portada, índice y capítulos
            preparados para leer cómodo en tinta electrónica.
          </p>
          <div className="actions">
            <a className="button" href="#suscribirme">
              Recibir en mi Kindle
            </a>
            <Link className="button secondary" href="/docs">
              Leer funcionamiento
            </Link>
          </div>
        </div>
        <aside className="kindle-card magazine-preview" aria-label="Vista previa editorial">
          <p className="eyebrow">Próxima entrega</p>
          <h2>Revista 421</h2>
          <p className="issue">#14 · Abril 2026</p>
          <hr />
          <ol className="mini-toc">
            <li>Editorial</li>
            <li>¿Sueñan los modelos de lenguaje con ovejas eléctricas?</li>
            <li>Notas, entrevistas y ensayos del especial</li>
          </ol>
          <p className="device-note">Llega como EPUB adjunto a tu dirección @kindle.com.</p>
        </aside>
      </section>

      <section className="flow" aria-label="Funcionamiento">
        <article className="panel">
          <span className="step">1</span>
          <h2>Dejás tu @kindle</h2>
          <p className="muted">No hay cuenta ni login. Solo necesitamos la dirección Send-to-Kindle.</p>
        </article>
        <article className="panel">
          <span className="step">2</span>
          <h2>Autorizás el remitente</h2>
          <p className="muted">Amazon solo acepta documentos desde emails aprobados por vos.</p>
        </article>
        <article className="panel">
          <span className="step">3</span>
          <h2>Recibís cada número</h2>
          <p className="muted">Cuando sale una revista nueva, llega como un libro independiente en tu biblioteca.</p>
        </article>
      </section>

      <section className="panel stack" id="suscribirme">
        <h2 className="section-title">Suscribirme</h2>
        <p className="lead">
          No necesitás crear usuario. Dejá tu dirección <strong>@kindle.com</strong>, autorizá el remitente en Amazon
          y te enviamos cada número mensual cuando esté listo.
        </p>
        {params.subscribed ? (
          <p className="notice">Listo. Guardamos tu dirección Kindle y la suscripción quedó activa.</p>
        ) : null}
        {params.error ? (
          <p className="notice">
            No pudimos guardar la suscripción. Código: {params.error}. Revisá la configuración o compartime ese código.
          </p>
        ) : null}
        {params.test === "sent" ? (
          <p className="notice">Enviamos una edición de prueba a esa dirección Kindle.</p>
        ) : null}
        <form className="form" action={subscribeAction}>
          <label>
            Dirección Kindle
            <input required type="email" name="kindleEmail" placeholder="tu-nombre@kindle.com" />
          </label>
          <div className="panel">
            <h3>Checklist rápida</h3>
            <ol className="checklist">
              <li>Buscá tu dirección en Amazon, sección “Send to Kindle Email Settings”.</li>
              <li>Autorizá nuestro remitente de envío en Amazon.</li>
              <li>Cada número mensual aparecerá como un libro/documento nuevo en tu biblioteca.</li>
            </ol>
            <label className="row">
              <input required type="checkbox" name="acceptedChecklist" />
              Confirmo que entiendo la configuración de Amazon/Kindle y quiero activar el envío.
            </label>
          </div>
          <button className="button" type="submit">
            Activar suscripción
          </button>
        </form>
      </section>

      <section className="grid" aria-label="Caracteristicas">
        <div className="panel">
          <h2>Solo la revista</h2>
          <p className="muted">No mandamos artículos sueltos ni newsletters diarias. Solo los especiales mensuales.</p>
        </div>
        <div className="panel">
          <h2>Versión e-reader</h2>
          <p className="muted">Convertimos el PDF en una lectura fluida, con capítulos navegables y texto reflowable.</p>
        </div>
        <div className="panel">
          <h2>Biblioteca ordenada</h2>
          <p className="muted">Cada entrega queda como un número independiente, ideal para coleccionar y volver a leer.</p>
        </div>
      </section>
    </main>
  );
}
