import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");
  if (!payload) return null;
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    role?: string;
    ref?: string;
    iss?: string;
    exp?: number;
  };
}

export async function GET(request: Request) {
  const env = getEnv();
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const anonPayload = decodeJwtPayload(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const servicePayload = decodeJwtPayload(env.SUPABASE_SERVICE_ROLE_KEY);

  return NextResponse.json({
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    supabaseUrlHost: new URL(env.NEXT_PUBLIC_SUPABASE_URL).host,
    anonRole: anonPayload?.role ?? null,
    anonRef: anonPayload?.ref ?? null,
    serviceRole: servicePayload?.role ?? null,
    serviceRef: servicePayload?.ref ?? null,
    notifyFailuresConfigured: Boolean(env.NOTIFY_FAILURES_TO),
    emailFromConfigured: Boolean(env.EMAIL_FROM),
  });
}
