import Image from "next/image";
import { subscribeAction } from "@/app/actions";
import { CopyChip } from "@/app/copy-chip";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ subscribed?: string; delivery?: string; error?: string; test?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="kindle421-home">
      <a className="skip" href="#suscribirme">
        Saltar a la suscripción
      </a>

      <section className="hero">
        <section className="hero-intro">
          <h1 className="display">
            La&nbsp;Revista&nbsp;421
            <br />
            <span className="accent">en&nbsp;tu&nbsp;Kindle.</span>
          </h1>
          <p className="lede">
            Recibí cada especial mensual de{" "}
            <a className="inline-link" href="https://421.news" target="_blank" rel="noreferrer noopener">
              421.news
            </a>{" "}
            como un libro nuevo en tu Kindle: portada, índice y capítulos preparados para leer como un/a chad total.
          </p>
        </section>

        <aside className="device-panel" aria-label="Última entrega en Kindle">
          <div className="device-labels">
            <span className="mono">
              <strong>Última Entrega:</strong> Especial Inteligencia Artificial
            </span>
          </div>
          <div className="kindle">
            <div className="kindle-screen">
              <Image
                src="/kindle421/cover-14-kindle.png"
                alt="Tapa de Revista 421 #14 — abril 2026"
                fill
                sizes="(min-width: 1024px) 430px, 80vw"
                priority
              />
              <div className="kindle-scanlines" aria-hidden="true" />
            </div>
          </div>
          <dl className="issue-credits">
            <div>
              <dt>Ilustración de portada:</dt>
              <dd>Martín Pouso</dd>
            </div>
            <div>
              <dt>Diseño:</dt>
              <dd>Pablo Tempesta</dd>
            </div>
          </dl>
          <div className="kindle-watermark" aria-hidden="true">
            14
          </div>
        </aside>

        <section className="hero-body">
          <ol className="steps" aria-label="Cómo funciona en 3 pasos">
            <li className="step">
              <div className="step-num" aria-hidden="true">
                1
              </div>
              <h3 className="step-title">Configurá Amazon</h3>
              <p className="step-desc">
                Abrí{" "}
                <a
                  className="inline-link"
                  href="https://www.amazon.com/hz/mycd/preferences/myx#/home/settings/payment"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  tu configuración de Kindle
                </a>{" "}
                y agregá a <CopyChip value="envios@kindle421.xyz" />.
              </p>
            </li>
            <li className="step">
              <div className="step-num" aria-hidden="true">
                2
              </div>
              <h3 className="step-title">Suscribite a Kindle421</h3>
              <p className="step-desc">
                Dejá tu dirección <code className="kindle-domain">@kindle.com</code> acá abajo, es gratis.
              </p>
            </li>
            <li className="step">
              <div className="step-num" aria-hidden="true">
                3
              </div>
              <h3 className="step-title">Sincronizá tu Kindle</h3>
              <p className="step-desc">En unos minutos ya deberías ver la última entrega en tu Kindle ;)</p>
            </li>
          </ol>

          <section className="subscribe" id="suscribirme" aria-label="Suscripción a Kindle421">
            {params.subscribed ? (
              <p className="subscribe-fineprint is-success" role="status">
                {params.delivery === "sent"
                  ? "Listorti. en 5' refrescá el Kindle y te va a descargar la revista"
                  : "Listorti. Guardamos tu dirección Kindle y la suscripción quedó activa."}
              </p>
            ) : null}
            {params.error ? (
              <p className="subscribe-fineprint is-error" role="status">
                No pudimos guardar la suscripción. Código: {params.error}. Revisá la configuración o compartime ese
                código.
              </p>
            ) : null}
            {params.test === "sent" ? (
              <p className="subscribe-fineprint is-success" role="status">
                Enviamos una edición de prueba a esa dirección Kindle.
              </p>
            ) : null}
            <form className="subscribe-form" action={subscribeAction}>
              <input type="hidden" name="acceptedChecklist" value="on" />
              <label className="subscribe-field">
                <input
                  type="email"
                  name="kindleEmail"
                  required
                  autoComplete="email"
                  placeholder="tu-nombre@kindle.com"
                  pattern=".+@kindle\.com$"
                  title="Tiene que terminar en @kindle.com"
                />
              </label>
              <button className="subscribe-submit" type="submit">
                <span className="subscribe-submit-label">Activar suscripción</span>
                <span className="subscribe-submit-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            </form>
          </section>
        </section>
      </section>
      <footer className="home-footer mono">Reconstruido con 🥛 en Buenos Aires</footer>
    </main>
  );
}
