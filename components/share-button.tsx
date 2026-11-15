"use client";

import { useState } from "react";

/** Shares an image via the native share sheet (WhatsApp etc.), or downloads it. */
export function ShareButton({ url, filename, title, className = "" }: { url: string; filename: string; title: string; className?: string }) {
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("image");
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      }
    } catch {
      /* cancelled or failed */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-50 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      </svg>
      {busy ? "Preparing…" : "Share image"}
    </button>
  );
}
