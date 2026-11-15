"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db, ensureSchema } from "@/lib/db";
import { endSession, startSession } from "@/lib/session";

export type LoginResult = { ok: true; slug: string } | { ok: false; error: string };

const MAX_TRIES = 5;
const LOCK_MINUTES = 15;

export async function loginWithPin(playerId: string, pin: string): Promise<LoginResult> {
  await ensureSchema();
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "Enter your 4-digit PIN." };
  const sql = db();
  const [p] = (await sql`
    SELECT id, slug, pin_hash, failed_pins, locked_until FROM players WHERE id = ${playerId} AND active`) as {
    id: string;
    slug: string;
    pin_hash: string;
    failed_pins: number;
    locked_until: string | null;
  }[];
  if (!p) return { ok: false, error: "Player not found." };

  if (p.locked_until && new Date(p.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(p.locked_until).getTime() - Date.now()) / 60000);
    return { ok: false, error: `Too many wrong PINs. Try again in ${mins} min.` };
  }

  if (!(await bcrypt.compare(pin, p.pin_hash))) {
    const fails = p.failed_pins + 1;
    if (fails >= MAX_TRIES) {
      await sql`UPDATE players SET failed_pins = 0, locked_until = now() + make_interval(mins => ${LOCK_MINUTES}) WHERE id = ${p.id}`;
      return { ok: false, error: `Too many wrong PINs. Locked for ${LOCK_MINUTES} min.` };
    }
    await sql`UPDATE players SET failed_pins = ${fails} WHERE id = ${p.id}`;
    return { ok: false, error: `Wrong PIN. ${MAX_TRIES - fails} tries left.` };
  }

  await sql`UPDATE players SET failed_pins = 0, locked_until = NULL WHERE id = ${p.id}`;
  await startSession(p.id);
  return { ok: true, slug: p.slug };
}

export async function logout() {
  await endSession();
  redirect("/");
}
