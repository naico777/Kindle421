import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { Subscription } from "@/lib/types";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const params = await searchParams;
  if (params.key !== getEnv().CRON_SECRET) redirect("/");

  const admin = createSupabaseAdminClient();
  const { data: subscriptions, error } = await admin
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return (
    <main className="page">
      <section className="panel stack">
        <h1 className="section-title">Admin</h1>
        <p className="lead">Vista mínima para operar la beta: configuración, último envío y fallos recientes.</p>
        <table>
          <thead>
            <tr>
              <th>Cuenta</th>
              <th>Kindle</th>
              <th>Estado</th>
              <th>Último envío</th>
              <th>Último fallo</th>
            </tr>
          </thead>
          <tbody>
            {((subscriptions ?? []) as Subscription[]).map((subscription) => (
              <tr key={subscription.id}>
                <td>Sin cuenta</td>
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
