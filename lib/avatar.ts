import "server-only";

const MAX_BYTES = 600 * 1024;
const TYPES = ["image/webp", "image/jpeg", "image/png"];

/** Reads an avatar upload (already resized client-side). Returns null when no file was sent. */
export async function readAvatar(value: FormDataEntryValue | null) {
  if (!value || typeof value === "string" || value.size === 0) return null;
  if (!TYPES.includes(value.type)) return { error: "Avatar must be a JPG, PNG or WebP image." } as const;
  if (value.size > MAX_BYTES) return { error: "Avatar is too large. Try another photo." } as const;
  const b64 = Buffer.from(await value.arrayBuffer()).toString("base64");
  return { b64, type: value.type } as const;
}
