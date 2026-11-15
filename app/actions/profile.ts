"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db, uniqueViolation } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { uniqueSlug } from "@/lib/players";
import { isPosition } from "@/lib/positions";
import { readAvatar } from "@/lib/avatar";
import type { ActionResult } from "./join";

export async function updateProfile(form: FormData): Promise<ActionResult> {
  const me = await currentPlayer();
  if (!me) return { ok: false, error: "Please log in again." };

  const name = String(form.get("name") ?? "").trim();
  const gamertag = String(form.get("gamertag") ?? "").trim();
  const number = Number(form.get("number"));
  const primary = String(form.get("primary") ?? "");
  const secondary = String(form.get("secondary") ?? "")
    .split(",")
    .filter((p) => p && p !== primary);

  if (name.length < 2 || name.length > 24) return { ok: false, error: "Display name must be 2–24 characters." };
  if (gamertag.length < 2 || gamertag.length > 32) return { ok: false, error: "Enter your exact EA ID / gamertag." };
  if (!Number.isInteger(number) || number < 1 || number > 99) return { ok: false, error: "Pick a jersey number from 1 to 99." };
  if (!isPosition(primary)) return { ok: false, error: "Pick your main position." };
  if (!secondary.every(isPosition) || secondary.length > 3) return { ok: false, error: "Pick up to 3 secondary positions." };

  const avatar = await readAvatar(form.get("avatar"));
  if (avatar && !avatar.ok) return { ok: false, error: avatar.error };

  const sql = db();
  const slug = name === me.display_name ? me.slug : await uniqueSlug(name, me.id);
  try {
    await sql`
      UPDATE players SET display_name = ${name}, slug = ${slug}, ea_gamertag = ${gamertag}, jersey_number = ${number},
        primary_position = ${primary}, secondary_positions = ${secondary}
      WHERE id = ${me.id}`;
    if (avatar) {
      await sql`UPDATE players SET avatar_b64 = ${avatar.b64}, avatar_type = ${avatar.type},
        avatar_version = avatar_version + 1 WHERE id = ${me.id}`;
    }
  } catch (err) {
    const c = uniqueViolation(err);
    if (c === "players_jersey_active_uq") return { ok: false, error: `#${number} is already taken.` };
    if (c === "players_gamertag_uq") return { ok: false, error: "That EA ID is already registered." };
    throw err;
  }
  revalidatePath("/", "layout");
  return { ok: true, slug };
}

export async function changePin(current: string, next: string): Promise<ActionResult> {
  const me = await currentPlayer();
  if (!me) return { ok: false, error: "Please log in again." };
  if (!/^\d{4}$/.test(next)) return { ok: false, error: "New PIN must be 4 digits." };
  const sql = db();
  const [row] = (await sql`SELECT pin_hash FROM players WHERE id = ${me.id}`) as { pin_hash: string }[];
  if (!row || !(await bcrypt.compare(current, row.pin_hash))) return { ok: false, error: "Current PIN is wrong." };
  await sql`UPDATE players SET pin_hash = ${await bcrypt.hash(next, 10)} WHERE id = ${me.id}`;
  return { ok: true };
}
