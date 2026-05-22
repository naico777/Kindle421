"use server";

import { redirect } from "next/navigation";
import { normalizeEmail } from "@/lib/security";
import { clearAdminSession, createAdminSession, hasAdminSession, isAdminKey } from "@/lib/admin-auth";
import { sendLatestMagazineIssueToSubscription, sendMagazineIssue, sendMagazineTest } from "@/lib/delivery";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { magazineIssueSchema, magazineSendSchema, magazineTestSchema, subscriptionSchema } from "@/lib/validation";
import { verifyCaptcha } from "@/lib/security";

export async function subscribeAction(formData: FormData) {
  const parsed = subscriptionSchema.safeParse({
    kindleEmail: formData.get("kindleEmail"),
    acceptedChecklist: formData.get("acceptedChecklist") === "on",
    captchaToken: formData.get("captchaToken")?.toString(),
  });

  if (!parsed.success) redirect("/?error=invalid#suscribirme");

  const captchaOk = await verifyCaptcha(parsed.data.captchaToken);
  if (!captchaOk) redirect("/?error=captcha#suscribirme");

  const supabase = createSupabaseAdminClient();
  const kindleEmail = normalizeEmail(parsed.data.kindleEmail);
  const { data: allowed, error: rateError } = await supabase.rpc("touch_rate_limit", {
    limit_key: `subscribe:${kindleEmail}`,
    max_count: 5,
    window_seconds: 3600,
  });

  if (rateError) {
    console.error("Kindle421 subscribe rate limit error", rateError);
    redirect("/?error=rate-db#suscribirme");
  }

  if (allowed === false) redirect("/?error=rate#suscribirme");

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        kindle_email: kindleEmail,
        delivery_enabled: true,
        accepted_terms_at: new Date().toISOString(),
        last_failure_at: null,
        last_failure_message: null,
      },
      { onConflict: "kindle_email" },
    )
    .select("id")
    .single();

  if (error) {
    console.error("Kindle421 subscribe upsert error", error);
    redirect(`/?error=db-${encodeURIComponent(error.code ?? "unknown")}#suscribirme`);
  }

  let deliveryStatus = "none";
  try {
    const deliveryResult = subscription ? await sendLatestMagazineIssueToSubscription(subscription.id) : null;
    deliveryStatus = deliveryResult?.status ?? "none";
  } catch (deliveryError) {
    console.error("Kindle421 instant delivery error", deliveryError);
    deliveryStatus = "failed";
  }

  redirect(`/?subscribed=1&delivery=${deliveryStatus}#suscribirme`);
}

export async function createMagazineIssueAction(formData: FormData) {
  await assertAdmin();

  const parsed = magazineIssueSchema.safeParse({
    issueNumber: formData.get("issueNumber"),
    title: formData.get("title"),
    publicationDate: formData.get("publicationDate"),
    sourceFilename: formData.get("sourceFilename"),
    coverImageUrl: formData.get("coverImageUrl"),
    sourceText: formData.get("sourceText"),
  });

  if (!parsed.success) redirect(adminUrl("issue-invalid"));

  const supabase = createSupabaseAdminClient();
  const slug = `revista-421-${parsed.data.issueNumber}`;

  const { error } = await supabase.from("magazine_issues").upsert(
    {
      issue_number: parsed.data.issueNumber,
      title: parsed.data.title,
      slug,
      publication_date: parsed.data.publicationDate,
      source_filename: parsed.data.sourceFilename || null,
      cover_image_url: parsed.data.coverImageUrl || null,
      source_text: parsed.data.sourceText,
      status: "draft",
      epub_fingerprint: null,
    },
    { onConflict: "issue_number" },
  );

  if (error) {
    console.error("Kindle421 issue upsert error", error);
    redirect(adminUrl(`issue-db-${encodeURIComponent(error.code ?? "unknown")}`));
  }

  redirect(adminUrl("issue-saved"));
}

export async function sendMagazineTestAction(formData: FormData) {
  await assertAdmin();

  const parsed = magazineTestSchema.safeParse({
    issueId: formData.get("issueId"),
    kindleEmail: formData.get("kindleEmail"),
  });

  if (!parsed.success) redirect(adminUrl("test-invalid"));

  await sendMagazineTest(parsed.data.issueId, normalizeEmail(parsed.data.kindleEmail));
  redirect(adminUrl("test-sent"));
}

export async function sendMagazineIssueAction(formData: FormData) {
  await assertAdmin();

  const parsed = magazineSendSchema.safeParse({
    issueId: formData.get("issueId"),
  });

  if (!parsed.success) redirect(adminUrl("send-invalid"));

  const results = await sendMagazineIssue(parsed.data.issueId);
  const sent = results.filter((result) => result.status === "sent").length;
  const failed = results.filter((result) => result.status === "failed").length;
  const skipped = results.filter((result) => result.status === "skipped").length;

  redirect(adminUrl(`send-${sent}-${failed}-${skipped}`));
}

export async function loginAdminAction(formData: FormData) {
  if (!isAdminKey(formData.get("adminKey"))) redirect(adminUrl("auth-invalid"));

  await createAdminSession();
  redirect("/admin");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/");
}

async function assertAdmin() {
  if (!(await hasAdminSession())) redirect(adminUrl("auth-required"));
}

function adminUrl(status: string) {
  return `/admin?status=${encodeURIComponent(status)}`;
}
