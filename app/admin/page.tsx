import {
  createMagazineIssueAction,
  loginAdminAction,
  logoutAdminAction,
  sendMagazineIssueAction,
  sendMagazineTestAction,
} from "@/app/actions";
import { hasAdminSession } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { MagazineIssue, Subscription } from "@/lib/types";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const isAdmin = await hasAdminSession();

  if (!isAdmin) {
    return (
      <main className="page">
        <section className="panel stack">
          <h1 className="section-title">Admin</h1>
          <p className="lead">Entrá con la clave operativa para cargar y publicar números de Kindle421.</p>
          {params.status ? <p className="notice">Resultado: {humanStatus(params.status)}</p> : null}
          <form className="form" action={loginAdminAction}>
            <label>
              Clave admin
              <input required name="adminKey" type="password" autoComplete="current-password" />
            </label>
            <button className="button" type="submit">
              Entrar
            </button>
          </form>
        </section>
      </main>
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (subscriptionsError) throw subscriptionsError;

  const { data: issues, error: issuesError } = await admin
    .from("magazine_issues")
    .select("*")
    .order("publication_date", { ascending: false })
    .limit(20);

  if (issuesError) throw issuesError;

  return (
    <main className="page">
      <section className="panel stack">
        <h1 className="section-title">Admin</h1>
        <p className="lead">Operación manual de la revista mensual: cargar número, mandar prueba y publicar a suscriptores.</p>
        {params.status ? <p className="notice">Resultado: {humanStatus(params.status)}</p> : null}
        <form action={logoutAdminAction}>
          <button className="link-button" type="submit">
            Salir del admin
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Nuevo número</h2>
        <p className="muted">
          Pegá el texto adaptado. Para separar capítulos, usá líneas tipo <code># Título del capítulo</code>.
        </p>
        <form className="form wide-form" action={createMagazineIssueAction}>
          <div className="grid form-grid">
            <label>
              Número
              <input required type="number" min="1" name="issueNumber" placeholder="14" />
            </label>
            <label>
              Título Kindle
              <input required name="title" placeholder="421 #14: Especial Inteligencia Artificial (Abril '26)" />
            </label>
            <label>
              Fecha
              <input required type="date" name="publicationDate" />
            </label>
          </div>
          <label>
            Archivo fuente
            <input name="sourceFilename" placeholder="14_abril.pdf" />
          </label>
          <label>
            URL de portada
            <input name="coverImageUrl" type="url" placeholder="https://..." />
          </label>
          <label>
            Texto adaptado
            <textarea required name="sourceText" rows={18} placeholder="# Editorial&#10;&#10;Texto...&#10;&#10;# Nota principal&#10;&#10;Texto..." />
          </label>
          <button className="button" type="submit">
            Guardar número
          </button>
        </form>
      </section>

      <section className="panel stack">
        <h2>Números</h2>
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Título</th>
              <th>Estado</th>
              <th>Prueba</th>
              <th>Publicar</th>
            </tr>
          </thead>
          <tbody>
            {((issues ?? []) as MagazineIssue[]).map((issue) => (
              <tr key={issue.id}>
                <td>#{issue.issue_number}</td>
                <td>
                  {issue.cover_image_url ? (
                    <span className="issue-cover-thumb" aria-hidden="true" style={{ backgroundImage: `url(${issue.cover_image_url})` }} />
                  ) : null}
                  <strong>{issue.title}</strong>
                  <br />
                  <span className="muted">{new Date(`${issue.publication_date}T12:00:00-03:00`).toLocaleDateString("es-AR")} · {issue.source_filename ?? "sin archivo"}</span>
                </td>
                <td>
                  <span className={`status ${issue.status === "sent" ? "ok" : ""}`}>{issue.status}</span>
                  <br />
                  <span className="muted">Test: {issue.last_test_at ? new Date(issue.last_test_at).toLocaleString("es-AR") : "no"}</span>
                </td>
                <td>
                  <form className="inline-form" action={sendMagazineTestAction}>
                    <input type="hidden" name="issueId" value={issue.id} />
                    <input required type="email" name="kindleEmail" placeholder="test@kindle.com" />
                    <button className="button secondary" type="submit">Enviar prueba</button>
                  </form>
                </td>
                <td>
                  <form action={sendMagazineIssueAction}>
                    <input type="hidden" name="issueId" value={issue.id} />
                    <button className="button" type="submit">Enviar a todos</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel stack">
        <h2>Suscriptores</h2>
        <p className="lead">Direcciones activas y últimos fallos.</p>
        <table>
          <thead>
            <tr>
              <th>Kindle</th>
              <th>Estado</th>
              <th>Último envío</th>
              <th>Último fallo</th>
            </tr>
          </thead>
          <tbody>
            {((subscriptions ?? []) as Subscription[]).map((subscription) => (
              <tr key={subscription.id}>
                <td>{subscription.kindle_email}</td>
                <td>
                  <span className={`status ${subscription.delivery_enabled && !subscription.last_failure_at ? "ok" : "bad"}`}>
                    {subscription.delivery_enabled ? "Activo" : "Pausado"}
                  </span>
                </td>
                <td>{subscription.last_success_at ? new Date(subscription.last_success_at).toLocaleString("es-AR") : "Nunca"}</td>
                <td>{subscription.last_failure_message ?? "Sin fallos"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function humanStatus(status: string) {
  if (status === "auth-invalid") return "clave admin inválida";
  if (status === "auth-required") return "tenés que entrar al admin";
  if (status === "issue-saved") return "número guardado";
  if (status === "test-sent") return "prueba enviada";
  if (status.startsWith("send-")) {
    const [, sent, failed, skipped] = status.split("-");
    return `envío terminado: ${sent} enviados, ${failed} fallidos, ${skipped} omitidos`;
  }

  return status;
}
