import "server-only";
import crypto from "node:crypto";

const SECRET = process.env.AUTH_SECRET ?? "dev-only-insecure-secret";
const DEFAULT_TTL_HOURS = 168; // 7 days

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

/** Builds a signed, expiring, single-use-in-spirit download token for a
 * generated document. The token itself is never stored — only its SHA-256
 * hash (`secureTokenHash`) is, so a database read alone can't produce a
 * working download link. */
export function createDeliveryToken(documentId: string, ttlHours: number = DEFAULT_TTL_HOURS) {
  const expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;
  const payload = `${documentId}.${expiresAt}`;
  const signature = sign(payload);
  const token = base64url(`${payload}.${signature}`);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash, expiresAt: new Date(expiresAt) };
}

export interface VerifiedToken {
  documentId: string;
  expiresAt: number;
}

/** Verifies a token's signature and expiry (but not that it matches the
 * document's currently-stored hash — the caller must also compare against
 * `secureTokenHash`, which catches a token that's been superseded by a
 * freshly regenerated one). */
export function verifyDeliveryToken(token: string): VerifiedToken | null {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const parts = decoded.split(".");
  if (parts.length !== 3) return null;
  const [documentId, expiresAtStr, signature] = parts;
  const payload = `${documentId}.${expiresAtStr}`;
  const expected = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  return { documentId, expiresAt };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
