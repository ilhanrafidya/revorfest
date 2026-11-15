"use client";

import { useRef, useState } from "react";

/** Square-crops and downsizes a photo in the browser (512px WebP, JPEG fallback). */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const size = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 512, 512);
  const as = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85));
  const webp = await as("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  return (await as("image/jpeg"))!;
}

export function AvatarInput({
  name,
  initialSrc,
  onChange,
}: {
  name: string;
  initialSrc?: string | null;
  onChange: (blob: Blob | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialSrc ?? null);
  const [busy, setBusy] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const blob = await shrink(file);
      setPreview(URL.createObjectURL(blob));
      onChange(blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="group relative grid size-32 place-items-center overflow-hidden rounded-full bg-white/[0.06] ring-1 ring-white/15 transition active:scale-95"
      >
        {preview ? (
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-3xl font-semibold text-mute">{name ? name.slice(0, 2).toUpperCase() : "+"}</span>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1.5 text-[11px] font-medium text-chalk">
          {busy ? "Processing…" : preview ? "Change" : "Add photo"}
        </span>
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
      <p className="text-xs text-mute">Optional — square photos look best.</p>
    </div>
  );
}
