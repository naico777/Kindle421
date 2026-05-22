import crypto from "node:crypto";
import { getEnv } from "@/lib/env";

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function verifyCaptcha(token?: string) {
  const env = getEnv();
  const secret = env.CAPTCHA_SECRET;
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!secret || !siteKey) return true;
  if (!token) return false;

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  if (!response.ok) return false;

  const payload = (await response.json()) as { success?: boolean };
  return payload.success === true;
}
