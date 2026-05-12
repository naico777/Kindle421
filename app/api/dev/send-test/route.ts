import { NextResponse } from "next/server";
import { buildEdition } from "@/lib/edition";
import { sendKindleEdition } from "@/lib/email";
import { fetch421Feed } from "@/lib/feed";
import { normalizeEmail } from "@/lib/security";
import { subscriptionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Solo disponible en desarrollo." }, { status: 404 });
  }

  const url = new URL(request.url);
  const parsed = subscriptionSchema.safeParse({
    kindleEmail: url.searchParams.get("kindleEmail"),
    acceptedChecklist: true,
  });

  if (!parsed.success) return NextResponse.json({ error: "Dirección Kindle inválida." }, { status: 400 });

  const articles = (await fetch421Feed()).slice(0, 2);
  const edition = await buildEdition(articles);
  const kindleEmail = normalizeEmail(parsed.data.kindleEmail);

  await sendKindleEdition({
    to: kindleEmail,
    userEmail: kindleEmail,
    filename: edition.filename,
    epub: edition.buffer,
    articleCount: articles.length,
  });

  return NextResponse.json({ ok: true, recipient: kindleEmail, sent: articles.length });
}
