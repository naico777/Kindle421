import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

const ADMIN_COOKIE = "kindle421_admin";
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export async function createAdminSession() {
  const issuedAt = String(Math.floor(Date.now() / 1000));
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_COOKIE, `${issuedAt}.${sign(issuedAt)}`, {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!value) return false;

  const [issuedAt, signature] = value.split(".");
  if (!issuedAt || !signature || !secureCompare(sign(issuedAt), signature)) return false;

  const issuedAtSeconds = Number(issuedAt);
  if (!Number.isFinite(issuedAtSeconds)) return false;

  const ageSeconds = Math.floor(Date.now() / 1000) - issuedAtSeconds;
  return ageSeconds >= 0 && ageSeconds <= ADMIN_SESSION_MAX_AGE;
}

export function isAdminKey(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return false;
  return secureCompare(value, getEnv().CRON_SECRET);
}

function sign(value: string) {
  return crypto.createHmac("sha256", getEnv().CRON_SECRET).update(value).digest("base64url");
}

function secureCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.byteLength !== bBuffer.byteLength) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}
