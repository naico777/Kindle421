import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { runDailyDelivery } from "@/lib/delivery";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${getEnv().CRON_SECRET}`;

  if (authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const results = await runDailyDelivery();

  return NextResponse.json({
    ok: true,
    sent: results.filter((result) => result.status === "sent").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  });
}
