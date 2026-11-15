"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db, uniqueViolation } from "@/lib/db";
import { currentPlayer } from "@/lib/session";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function requireAdmin() {
  const me = await currentPlayer();
  return me?.role === "admin" ? me : null;
}

export async function setInviteCode(code: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Admins only." };
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(clean)) return { ok: false, error: "Use 4–16 letters or numbers." };
  await db()`UPDATE club_settings SET invite_code_hash = ${await bcrypt.hash(clean, 10)}, updated_at = now() WHERE id = 1`;
  return { ok: true, message: `Invite code changed to ${clean}.` };
}

export async function setRole(playerId: string, role: string): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: "Admins only." };
  if (!["player", "captain", "admin"].includes(role)) return { ok: false, error: "Unknown role." };
  if (playerId === me.id && role !== "admin") return { ok: false, error: "You can't remove your own admin role." };
  await db()`UPDATE players SET role = ${role} WHERE id = ${playerId}`;
  revalidatePath("/admin");
  return { ok: true };
}

export async function setActive(playerId: string, active: boolean): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: "Admins only." };
  if (playerId === me.id) return { ok: false, error: "You can't deactivate yourself." };
  try {
    await db()`UPDATE players SET active = ${active} WHERE id = ${playerId}`;
  } catch (err) {
    if (uniqueViolation(err)) return { ok: false, error: "Their jersey number is now used by someone else." };
    throw err;
  }
  revalidatePath("/admin");
  revalidatePath("/squad");
  return { ok: true };
}

export async function resetPin(playerId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "Admins only." };
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  await db()`UPDATE players SET pin_hash = ${await bcrypt.hash(pin, 10)}, failed_pins = 0, locked_until = NULL WHERE id = ${playerId}`;
  return { ok: true, message: pin };
}
