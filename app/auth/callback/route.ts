import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export async function GET() {
  return NextResponse.redirect(new URL("/#suscribirme", getEnv().NEXT_PUBLIC_SITE_URL));
}
