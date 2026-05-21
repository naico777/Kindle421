"use server";

import { redirect } from "next/navigation";
import { normalizeEmail } from "@/lib/security";
import { getEnv } from "@/lib/env";
import { sendMagazineIssue, sendMagazineTest } from "@/lib/delivery";
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

  const { error } = await supabase.from("subscriptions").upsert(
    {
      kindle_email: kindleEmail,
      delivery_enabled: true,
      accepted_terms_at: new Date().toISOString(),
      last_failure_at: null,
      last_failure_message: null,
    },
    { onConflict: "kindle_email" },
  );

  if (error) {
    console.error("Kindle421 subscribe upsert error", error);
    redirect(`/?error=db-${encodeURIComponent(error.code ?? "unknown")}#suscribirme`);
  }

  redirect("/?subscribed=1#suscribirme");
}

export async function createMagazineIssueAction(formData: FormData) {
  assertAdmin(formData);

  const parsed = magazineIssueSchema.safeParse({
    issueNumber: formData.get("issueNumber"),
    title: formData.get("title"),
    publicationDate: formData.get("publicationDate"),
    sourceFilename: formData.get("sourceFilename"),
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
  assertAdmin(formData);

  const parsed = magazineTestSchema.safeParse({
    issueId: formData.get("issueId"),
    kindleEmail: formData.get("kindleEmail"),
  });

  if (!parsed.success) redirect(adminUrl("test-invalid"));

  await sendMagazineTest(parsed.data.issueId, normalizeEmail(parsed.data.kindleEmail));
  redirect(adminUrl("test-sent"));
}

export async function sendMagazineIssueAction(formData: FormData) {
  assertAdmin(formData);

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

function assertAdmin(formData: FormData) {
  if (formData.get("adminKey") !== getEnv().CRON_SECRET) redirect("/");
}

function adminUrl(status: string) {
  return `/admin?key=${encodeURIComponent(getEnv().CRON_SECRET)}&status=${encodeURIComponent(status)}`;
}
