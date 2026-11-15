"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shares an image via the native share sheet (WhatsApp etc.), or downloads it.
 * The image is fetched ahead of time: iOS only allows navigator.share() right after a tap,
 * so waiting for a slow render inside the click handler made sharing silently fail.
 */
export function ShareButton({ url, filename, title, className = "" }: { url: string; filename: string; title: string; className?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const file = useRef<File | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const job = useRef<Promise<File | null> | null>(null);

  function load() {
    if (!job.current) {
      setState("loading");
      job.current = fetch(url, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) throw new Error(String(res.status));
          const blob = await res.blob();
          if (!blob.size) throw new Error("empty");
          file.current = new File([blob], filename, { type: blob.type || "image/png" });
          setState("ready");
          return file.current;
        })
        .catch(() => {
          job.current = null;
          setState("error");
          return null;
        });
    }
    return job.current;
  }

  // warm the image when the button scrolls into view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // url changed (e.g. lineup edited): drop the stale image
    job.current = null;
    file.current = null;
    setState("idle");
    const io = new IntersectionObserver((e) => {
      if (e[0]?.isIntersecting) {
        load();
        io.disconnect();
      }
    });
    const t = setTimeout(() => io.observe(el), 700);
    return () => {
      clearTimeout(t);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  function download(f: File) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function go() {
    const f = file.current;
    if (!f) {
      // not ready yet: finish loading, then ask for a second tap (keeps the share gesture fresh)
      await load();
      return;
    }
    try {
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title });
      else download(f);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") download(f);
    }
  }

  const label = state === "loading" ? "Preparing…" : state === "error" ? "Retry image" : "Share image";
  return (
    <button
      ref={ref}
      type="button"
      onClick={go}
      disabled={state === "loading"}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-60 ${className}`}
    >
      {state === "loading" ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
        </svg>
      )}
      {label}
    </button>
  );
}
