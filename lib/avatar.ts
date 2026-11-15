import "server-only";

const MAX_BYTES = 600 * 1024;
const TYPES = ["image/webp", "image/jpeg", "image/png"];

export type AvatarRead = { ok: true; b64: string; type: string } | { ok: false; error: string } | null;

/** Reads an avatar upload (already resized client-side). Returns null when no file was sent. */
export async function readAvatar(value: FormDataEntryValue | null): Promise<AvatarRead> {
  if (!value || typeof value === "string" || value.size === 0) return null;
  if (!TYPES.includes(value.type)) return { ok: false, error: "Avatar must be a JPG, PNG or WebP image." };
  if (value.size > MAX_BYTES) return { ok: false, error: "Avatar is too large. Try another photo." };
  const b64 = Buffer.from(await value.arrayBuffer()).toString("base64");
  return { ok: true, b64, type: value.type };
}
