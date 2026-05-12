import Link from "next/link";
import { subscribeAction, sendDevTestToKindleAction } from "@/app/actions";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ subscribed?: string; error?: string; test?: string }> }) {
  const params = await searchParams;

  return (
    <main className="page">
      <section className="hero">
        <div>
          <h1>421.news en tu Kindle, todos los dias.</h1>
          <p className="lead">
            Kindle421 genera una edicion EPUB minimalista con los articulos nuevos del RSS publico en español de
            421.news y la envia a tu direccion <strong>@kindle.com</strong> a las 06:00 de Argentina.
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
        <aside className="kindle-card" aria-label="Vista previa editorial">
          <h2>Kindle421</h2>
          <p>Edicion diaria</p>
          <hr />
          <p>Indice, portada fija y un articulo por capitulo. Sin scraping, sin historico completo, sin ruido.</p>
          <p className="notice">
            Importante: Kindle421 envia una nueva edicion. Amazon/Kindle puede mostrar varias versiones y v1 no
            controla el reemplazo remoto.
          </p>
        </aside>
      </section>

      <section className="panel stack" id="suscribirme">
        <h2 className="section-title">Suscribirme</h2>
        <p className="lead">
          No necesitás crear usuario. Dejá tu dirección <strong>@kindle.com</strong>, autorizá el remitente en Amazon
          y Kindle421 enviará la edición diaria cuando haya artículos nuevos.
        </p>
        {params.subscribed ? (
          <p className="notice">Listo. Guardamos tu dirección Kindle y la suscripción quedó activa.</p>
        ) : null}
        {params.error ? (
          <p className="notice">No pudimos guardar la suscripción. Revisá que sea una dirección @kindle.com válida.</p>
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
              <li>Autorizá el remitente configurado en Resend, por ejemplo `envios@tu-dominio.com`.</li>
              <li>Recordá que Kindle puede mostrar varias entregas; v1 no reemplaza documentos previos.</li>
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
        {process.env.NODE_ENV !== "production" ? (
          <form className="form" action={sendDevTestToKindleAction}>
            <label>
              Probar envío ahora a una dirección Kindle
              <input required type="email" name="kindleEmail" placeholder="tu-nombre@kindle.com" />
            </label>
            <button className="button secondary" type="submit">
              Enviar EPUB de prueba
            </button>
          </form>
        ) : null}
      </section>

      <section className="grid" aria-label="Caracteristicas">
        <div className="panel">
          <h2>Solo 421.news ES</h2>
          <p className="muted">Fuente unica: RSS publico en español. El EPUB usa el contenido de `content:encoded`.</p>
        </div>
        <div className="panel">
          <h2>Envio liviano</h2>
          <p className="muted">Si no hay articulos nuevos desde la ultima corrida exitosa, no se genera ni envia nada.</p>
        </div>
        <div className="panel">
          <h2>Beta chica</h2>
          <p className="muted">Registro abierto, datos minimos y admin simple para ver usuarios sanos o con fallos.</p>
        </div>
      </section>
    </main>
  );
}
