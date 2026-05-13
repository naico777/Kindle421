import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().trim().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().refine((value) => {
    const match = value.match(/<([^>]+)>$/);
    const email = match?.[1] ?? value;
    return z.string().email().safeParse(email.trim()).success;
  }, "EMAIL_FROM debe ser un email o el formato Nombre <email@dominio.com>."),
  CRON_SECRET: z.string().min(16),
  ADMIN_EMAILS: z.string().default(""),
  CAPTCHA_SECRET: z.string().optional(),
  NOTIFY_FAILURES_TO: z.preprocess(
    (value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().email().optional().catch(undefined),
  ),
});

export function getEnv() {
  return envSchema.parse(process.env);
}

export function getAdminEmails() {
  return new Set(
    getEnv()
      .ADMIN_EMAILS.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}
