import { buildEdition } from "@/lib/edition";
import { notifyOperator, sendKindleEdition } from "@/lib/email";
import { fetch421Feed, selectNewArticles } from "@/lib/feed";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { DeliveryResult, Subscription } from "@/lib/types";

const DAILY_SEND_LIMIT = 1;
const MAX_ARTICLES_PER_EDITION = 20;

export async function runDailyDelivery(): Promise<DeliveryResult[]> {
  const supabase = createSupabaseAdminClient();
  const articles = await fetch421Feed();

  if (articles.length === 0) {
    await notifyOperator("El RSS de 421.news no devolvio articulos parseables.");
    return [];
  }

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("delivery_enabled", true);

  if (error) throw error;

  const results: DeliveryResult[] = [];

  for (const subscription of (subscriptions ?? []) as Subscription[]) {
    results.push(await deliverToSubscription(subscription, articles));
  }

  return results;
}

async function deliverToSubscription(subscription: Subscription, allArticles: Awaited<ReturnType<typeof fetch421Feed>>): Promise<DeliveryResult> {
  const supabase = createSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const sendCount = subscription.send_count_date === today ? subscription.send_count_today : 0;

  if (sendCount >= DAILY_SEND_LIMIT) {
    return { status: "skipped", subscriptionId: subscription.id, reason: "tope diario alcanzado" };
  }

  const newArticles = selectNewArticles(allArticles, subscription.last_article_fingerprint).slice(0, MAX_ARTICLES_PER_EDITION);

  if (newArticles.length === 0) {
    return { status: "skipped", subscriptionId: subscription.id, reason: "sin articulos nuevos" };
  }

  try {
    const edition = await buildEdition(newArticles);

    if (edition.fingerprint === subscription.last_edition_fingerprint) {
      return { status: "skipped", subscriptionId: subscription.id, reason: "fingerprint duplicado" };
    }

    await sendKindleEdition({
      to: subscription.kindle_email,
      userEmail: subscription.kindle_email,
      filename: edition.filename,
      epub: edition.buffer,
      articleCount: newArticles.length,
    });

    const { error } = await supabase
      .from("subscriptions")
      .update({
        last_article_fingerprint: newArticles[0]?.fingerprint,
        last_edition_fingerprint: edition.fingerprint,
        last_success_at: new Date().toISOString(),
        last_failure_at: null,
        last_failure_message: null,
        send_count_today: sendCount + 1,
        send_count_date: today,
      })
      .eq("id", subscription.id);

    if (error) throw error;

    return { status: "sent", subscriptionId: subscription.id, articleCount: newArticles.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fallo desconocido";

    await supabase
      .from("subscriptions")
      .update({
        last_failure_at: new Date().toISOString(),
        last_failure_message: message,
      })
      .eq("id", subscription.id);

    await notifyOperator(`Fallo enviando a ${subscription.kindle_email} (${subscription.id}): ${message}`);

    return { status: "failed", subscriptionId: subscription.id, error: message };
  }
}
