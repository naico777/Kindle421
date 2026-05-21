import { Resend } from "resend";
import { getEnv } from "@/lib/env";

const MAX_ATTEMPTS = 3;

export async function sendKindleEdition(params: {
  to: string;
  userEmail: string;
  filename: string;
  epub: Buffer;
  articleCount: number;
}) {
  const env = getEnv();
  const resend = new Resend(env.RESEND_API_KEY);
  const subject = `Kindle421: ${params.articleCount} articulo${params.articleCount === 1 ? "" : "s"} nuevo${params.articleCount === 1 ? "" : "s"}`;

  return retry(async () => {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: params.to,
      subject,
      text: [
        "Hola,",
        "",
        "Adjuntamos tu edicion diaria de Kindle421.",
        "Recordatorio: Kindle421 envia una nueva edicion, pero Amazon/Kindle no garantiza reemplazar la anterior.",
        "",
        `Email de cuenta: ${params.userEmail}`,
      ].join("\n"),
      attachments: [
        {
          filename: params.filename,
          content: params.epub.toString("base64"),
        },
      ],
    });

    if (result.error) throw new Error(result.error.message);
    return result;
  });
}

export async function sendMagazineEdition(params: {
  to: string;
  filename: string;
  epub: Buffer;
  issueTitle: string;
  issueNumber: number;
  chapterCount: number;
}) {
  const env = getEnv();
  const resend = new Resend(env.RESEND_API_KEY);
  const subject = params.issueTitle;

  return retry(async () => {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: params.to,
      subject,
      text: [
        "Hola,",
        "",
        `Adjuntamos ${params.issueTitle}, adaptada para Kindle.`,
        `Incluye ${params.chapterCount} capitulo${params.chapterCount === 1 ? "" : "s"}.`,
        "",
        "Cada numero mensual llega como un documento/libro nuevo en tu biblioteca Kindle.",
      ].join("\n"),
      attachments: [
        {
          filename: params.filename,
          content: params.epub.toString("base64"),
        },
      ],
    });

    if (result.error) throw new Error(result.error.message);
    return result;
  });
}

export async function notifyFailure(params: { to: string; message: string }) {
  const env = getEnv();
  const resend = new Resend(env.RESEND_API_KEY);

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: "Kindle421: no pudimos entregar tu edicion",
    text: [
      "Hola,",
      "",
      "No pudimos entregar la edicion diaria de Kindle421 despues de varios intentos.",
      "Revisa que tu direccion @kindle.com sea correcta y que el remitente este autorizado en Amazon.",
      "",
      `Detalle tecnico: ${params.message}`,
    ].join("\n"),
  });
}

export async function notifyOperator(message: string) {
  const env = getEnv();
  if (!env.NOTIFY_FAILURES_TO) return;

  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: env.NOTIFY_FAILURES_TO,
    subject: "Kindle421: fallo operativo",
    text: message,
  });
}

async function retry<T>(operation: () => Promise<T>) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Fallo desconocido de envio.");
}
