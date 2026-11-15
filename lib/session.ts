import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db, ensureSchema } from "./db";

const SESSION_COOKIE = "rf_session";
const INVITE_COOKIE = "rf_invite";

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s);
}

async function sign(payload: Record<string, unknown>, ttl: string) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(ttl).sign(key());
}

async function verify(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload;
  } catch {
    return null;
  }
}

const cookieBase = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

export async function startSession(playerId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sign({ sub: playerId }, "60d"), { ...cookieBase, maxAge: 60 * 60 * 24 * 60 });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function grantInvite() {
  const jar = await cookies();
  jar.set(INVITE_COOKIE, await sign({ invite: true }, "30m"), { ...cookieBase, maxAge: 60 * 30 });
}

export async function hasInvite() {
  const jar = await cookies();
  const p = await verify(jar.get(INVITE_COOKIE)?.value);
  return p?.invite === true;
}

export async function clearInvite() {
  const jar = await cookies();
  jar.delete(INVITE_COOKIE);
}

export type Me = {
  id: string;
  slug: string;
  display_name: string;
  jersey_number: number;
  role: "player" | "captain" | "admin";
  avatar_version: number;
  has_avatar: boolean;
};

/** The logged-in, active player (fresh from the database), or null. */
export async function currentPlayer(): Promise<Me | null> {
  const jar = await cookies();
  const p = await verify(jar.get(SESSION_COOKIE)?.value);
  if (!p?.sub || typeof p.sub !== "string") return null;
  try {
    await ensureSchema();
    const rows = await db()`
      SELECT id, slug, display_name, jersey_number, role, avatar_version, (avatar_b64 IS NOT NULL) AS has_avatar
      FROM players WHERE id = ${p.sub} AND active`;
    return (rows[0] as Me) ?? null;
  } catch {
    return null;
  }
}
