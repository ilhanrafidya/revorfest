"use server";

import bcrypt from "bcryptjs";
import { db, ensureSchema, uniqueViolation } from "@/lib/db";
import { clearInvite, grantInvite, hasInvite, startSession } from "@/lib/session";
import { takenNumbers, uniqueSlug } from "@/lib/players";
import { isPosition } from "@/lib/positions";
import { readAvatar } from "@/lib/avatar";

export type ActionResult = { ok: true; slug?: string } | { ok: false; error: string };

export async function checkInvite(code: string): Promise<ActionResult> {
  await ensureSchema();
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, error: "Enter the club invite code." };
  const [row] = (await db()`SELECT invite_code_hash FROM club_settings WHERE id = 1`) as { invite_code_hash: string | null }[];
  const valid = row?.invite_code_hash
    ? await bcrypt.compare(clean, row.invite_code_hash)
    : clean === (process.env.CLUB_INVITE_CODE ?? "").trim().toUpperCase();
  if (!valid) return { ok: false, error: "That code isn't right. Ask your captain." };
  await grantInvite();
  return { ok: true };
}

export async function getTakenNumbers() {
  return takenNumbers();
}

export async function register(form: FormData): Promise<ActionResult> {
  if (!(await hasInvite())) return { ok: false, error: "Your invite expired. Enter the club code again." };
  await ensureSchema();

  const name = String(form.get("name") ?? "").trim();
  const gamertag = String(form.get("gamertag") ?? "").trim();
  const number = Number(form.get("number"));
  const primary = String(form.get("primary") ?? "");
  const secondary = String(form.get("secondary") ?? "")
    .split(",")
    .filter((p) => p && p !== primary);
  const pin = String(form.get("pin") ?? "");

  if (name.length < 2 || name.length > 24) return { ok: false, error: "Display name must be 2–24 characters." };
  if (gamertag.length < 2 || gamertag.length > 32) return { ok: false, error: "Enter your exact EA ID / gamertag." };
  if (!Number.isInteger(number) || number < 1 || number > 99) return { ok: false, error: "Pick a jersey number from 1 to 99." };
  if (!isPosition(primary)) return { ok: false, error: "Pick your main position." };
  if (!secondary.every(isPosition) || secondary.length > 3) return { ok: false, error: "Pick up to 3 secondary positions." };
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: "Your PIN must be 4 digits." };

  const avatar = await readAvatar(form.get("avatar"));
  if (avatar && !avatar.ok) return { ok: false, error: avatar.error };

  const sql = db();
  const [{ count }] = (await sql`SELECT count(*)::int AS count FROM players`) as { count: number }[];
  const role = count === 0 ? "admin" : "player";
  const slug = await uniqueSlug(name);
  const pinHash = await bcrypt.hash(pin, 10);

  try {
    const [row] = (await sql`
      INSERT INTO players (slug, display_name, ea_gamertag, jersey_number, primary_position, secondary_positions,
                           avatar_b64, avatar_type, avatar_version, pin_hash, role)
      VALUES (${slug}, ${name}, ${gamertag}, ${number}, ${primary}, ${secondary},
              ${avatar?.b64 ?? null}, ${avatar?.type ?? null}, ${avatar ? 1 : 0}, ${pinHash}, ${role})
      RETURNING id, slug`) as { id: string; slug: string }[];
    await clearInvite();
    await startSession(row.id);
    return { ok: true, slug: row.slug };
  } catch (err) {
    const c = uniqueViolation(err);
    if (c === "players_jersey_active_uq") return { ok: false, error: `#${number} was just taken. Pick another number.` };
    if (c === "players_gamertag_uq") return { ok: false, error: "That EA ID is already registered." };
    throw err;
  }
}
