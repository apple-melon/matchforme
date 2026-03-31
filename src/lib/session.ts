import { createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "mf_session";

/** HS256용 바이트 시크릿. SESSION_SECRET 우선, 없으면 DATABASE_URL에서 안정적으로 파생 (배포 시 누락 방지). */
function getSecret(): Uint8Array {
  const explicit = process.env.SESSION_SECRET?.trim();
  if (explicit && explicit.length >= 16) {
    return new TextEncoder().encode(explicit);
  }
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (dbUrl && dbUrl.length >= 8) {
    return new Uint8Array(createHash("sha256").update(`mf-session-v1:${dbUrl}`).digest());
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET(16자 이상) 또는 DATABASE_URL이 필요합니다.");
  }
  return new TextEncoder().encode("dev-only-insecure-secret-min-32-chars!!");
}

export type SessionPayload = { sub: string; email: string };

export async function signSession(userId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    const email = payload.email;
    if (typeof sub !== "string" || typeof email !== "string") return null;
    return { sub, email };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export { COOKIE as SESSION_COOKIE_NAME };
