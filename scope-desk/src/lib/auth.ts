import "server-only";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE = "brsd_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a strong AUTH_SECRET in your .env file."
    );
  }
  return secret;
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function sign(payload: string): string {
  return base64url(crypto.createHmac("sha256", getSecret()).update(payload).digest());
}

/** Builds a tamper-evident session token: base64url(payload).base64url(hmac) */
function encodeSession(userId: string, expiresAt: number): string {
  const payload = JSON.stringify({ uid: userId, exp: expiresAt });
  const payloadB64 = base64url(Buffer.from(payload, "utf8"));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

function decodeSession(token: string): { uid: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  const expected = sign(payloadB64);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionCookie(userId: string) {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const token = encodeSession(userId, expiresAt);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const decoded = decodeSession(token);
  return decoded?.uid ?? null;
}

export async function getCurrentUser() {
  const uid = await getSessionUserId();
  if (!uid) return null;
  return db.user.findUnique({ where: { id: uid } });
}

/** Reads the session cookie straight from a NextRequest — used in proxy.ts (edge/node context, no cookies()). */
export function verifySessionToken(token: string | undefined): { uid: string } | null {
  if (!token) return null;
  const decoded = decodeSession(token);
  return decoded ? { uid: decoded.uid } : null;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
