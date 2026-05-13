"use server";

import { redirect } from "next/navigation";
import { normalizeEmail } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { subscriptionSchema } from "@/lib/validation";
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
