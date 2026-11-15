"use server";

import { revalidatePath } from "next/cache";
import { db, ensureSchema } from "@/lib/db";
import { currentPlayer } from "@/lib/session";
import { canManage } from "@/lib/matchday";
import { isFormation } from "@/lib/formations";
import { isKit } from "@/lib/kits";

type Result = { ok: true } | { ok: false; error: string };

async function manager() {
  const me = await currentPlayer();
  return me && canManage(me.role) ? me : null;
}

function done() {
  revalidatePath("/matchday");
  revalidatePath("/matchday/history");
  revalidatePath("/");
  return { ok: true } as const;
}

/** `local` is "YYYY-MM-DDTHH:mm" in WIB. */
export async function createMatchday(local: string, note: string): Promise<Result> {
  const me = await manager();
  if (!me) return { ok: false, error: "Only captains and admins can schedule matchdays." };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return { ok: false, error: "Pick a date and time." };
  const when = new Date(`${local}:00+07:00`);
  if (Number.isNaN(when.getTime())) return { ok: false, error: "Invalid date." };
  await ensureSchema();
  const sql = db();
  // Carry the latest formation + kit forward.
  const [prev] = (await sql`SELECT formation, kit FROM matchdays ORDER BY created_at DESC LIMIT 1`) as {
    formation: string;
    kit: string;
  }[];
  await sql`UPDATE matchdays SET status = 'done' WHERE status = 'open'`;
  await sql`INSERT INTO matchdays (scheduled_at, formation, kit, note, created_by)
            VALUES (${when.toISOString()}, ${prev?.formation ?? "4-3-3"}, ${prev?.kit ?? "home"},
                    ${note.trim().slice(0, 80) || null}, ${me.id})`;
  return done();
}

export async function closeMatchday(id: string): Promise<Result> {
  if (!(await manager())) return { ok: false, error: "Not allowed." };
  await db()`UPDATE matchdays SET status = 'done' WHERE id = ${id}`;
  return done();
}

export async function setAttendance(matchdayId: string, status: string): Promise<Result> {
  const me = await currentPlayer();
  if (!me) return { ok: false, error: "Log in first." };
  if (!["ready", "on_the_way", "out"].includes(status)) return { ok: false, error: "Unknown status." };
  const sql = db();
  await sql`INSERT INTO matchday_attendance (matchday_id, player_id, status, updated_at)
            VALUES (${matchdayId}, ${me.id}, ${status}, now())
            ON CONFLICT (matchday_id, player_id) DO UPDATE SET status = excluded.status, updated_at = now()`;
  if (status === "out") await sql`DELETE FROM lineup_slots WHERE matchday_id = ${matchdayId} AND player_id = ${me.id}`;
  return done();
}

export async function setFormation(matchdayId: string, formation: string): Promise<Result> {
  if (!(await manager())) return { ok: false, error: "Not allowed." };
  if (!isFormation(formation)) return { ok: false, error: "Unknown formation." };
  await db()`UPDATE matchdays SET formation = ${formation} WHERE id = ${matchdayId}`;
  return done();
}

export async function setKit(matchdayId: string, kit: string): Promise<Result> {
  if (!(await manager())) return { ok: false, error: "Not allowed." };
  if (!isKit(kit)) return { ok: false, error: "Unknown kit." };
  await db()`UPDATE matchdays SET kit = ${kit} WHERE id = ${matchdayId}`;
  return done();
}

/** Put a player in a slot (moving them out of any other slot), or clear the slot with null. */
export async function assignSlot(matchdayId: string, slot: number, playerId: string | null): Promise<Result> {
  if (!(await manager())) return { ok: false, error: "Not allowed." };
  if (!Number.isInteger(slot) || slot < 0 || slot > 10) return { ok: false, error: "Bad slot." };
  const sql = db();
  await sql`DELETE FROM lineup_slots WHERE matchday_id = ${matchdayId} AND slot = ${slot}`;
  if (playerId) {
    await sql`DELETE FROM lineup_slots WHERE matchday_id = ${matchdayId} AND player_id = ${playerId}`;
    await sql`INSERT INTO lineup_slots (matchday_id, slot, player_id) VALUES (${matchdayId}, ${slot}, ${playerId})`;
  }
  return done();
}

export async function clearLineup(matchdayId: string): Promise<Result> {
  if (!(await manager())) return { ok: false, error: "Not allowed." };
  await db()`DELETE FROM lineup_slots WHERE matchday_id = ${matchdayId}`;
  return done();
}
