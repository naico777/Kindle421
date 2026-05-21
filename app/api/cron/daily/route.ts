import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${getEnv().CRON_SECRET}`;

  if (authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    disabled: true,
    message: "El envio diario por RSS esta desactivado. Kindle421 ahora opera numeros mensuales desde el admin.",
  });
}
