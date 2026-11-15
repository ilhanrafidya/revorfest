"use client";

import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EASE } from "@/lib/motion";

type State = { s: "idle" } | { s: "loading" } | { s: "ready"; file: File; src: string } | { s: "error" };

/**
 * "Share image" → opens a preview sheet with the generated IG-story image,
 * then Share (native sheet: IG, WhatsApp…) or Save. The share tap happens inside
 * the sheet, so iOS still counts it as a direct user gesture.
 */
export function ShareButton({
  url,
  filename,
  title,
  className = "",
  label = "Share image",
}: {
  url: string;
  filename: string;
  title: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState<State>({ s: "idle" });
  const [mounted, setMounted] = useState(false);
  const objUrl = useRef<string | null>(null);
  useEffect(() => setMounted(true), []);

  function cleanup() {
    if (objUrl.current) URL.revokeObjectURL(objUrl.current);
    objUrl.current = null;
  }
  useEffect(() => cleanup, []);
  // lineup edits change the url → next open regenerates
  useEffect(() => {
    cleanup();
    setSt({ s: "idle" });
  }, [url]);

  async function load() {
    setSt({ s: "loading" });
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      if (!blob.size || !blob.type.startsWith("image/")) throw new Error("not an image");
      cleanup();
      objUrl.current = URL.createObjectURL(blob);
      setSt({ s: "ready", file: new File([blob], filename, { type: blob.type }), src: objUrl.current });
    } catch {
      setSt({ s: "error" });
    }
  }

  function openSheet() {
    setOpen(true);
    if (st.s !== "ready" && st.s !== "loading") load();
  }

  function save(f: File) {
    const a = document.createElement("a");
    a.href = objUrl.current ?? URL.createObjectURL(f);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function share() {
    if (st.s !== "ready") return;
    try {
      if (navigator.canShare?.({ files: [st.file] })) await navigator.share({ files: [st.file], title });
      else save(st.file);
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") save(st.file);
    }
  }

  const canNativeShare = st.s === "ready" && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [st.file] });

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition active:scale-95 ${className}`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
        </svg>
        {label}
      </button>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <m.div
                className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4 bg-black/80 p-4 backdrop-blur-md"
                style={{ paddingTop: "calc(16px + env(safe-area-inset-top))", paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              >
                <m.div
                  initial={{ y: 30, scale: 0.94, opacity: 0 }}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  exit={{ y: 30, scale: 0.94, opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative aspect-[9/16] h-[min(70svh,640px)] max-w-full overflow-hidden rounded-[22px] bg-white/[0.04] ring-1 ring-white/10"
                >
                  {st.s === "ready" ? (
                    <img src={st.src} alt="Story preview" className="size-full object-contain" />
                  ) : st.s === "error" ? (
                    <div className="grid size-full place-items-center p-6 text-center text-sm text-mute">
                      <div>
                        <p>Couldn&apos;t make this image.</p>
                        <button type="button" onClick={load} className="mt-3 rounded-full bg-white/10 px-4 py-2 font-semibold text-chalk">
                          Try again
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid size-full place-items-center">
                      <div className="flex flex-col items-center gap-3 text-xs text-mute">
                        <span className="size-7 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
                        Rendering story…
                      </div>
                    </div>
                  )}
                </m.div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={st.s !== "ready"}
                    onClick={share}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-on-accent transition active:scale-95 disabled:opacity-40"
                  >
                    {canNativeShare ? "Share to story" : "Download"}
                  </button>
                  {canNativeShare && st.s === "ready" && (
                    <button type="button" onClick={() => save(st.file)} className="glass hairline rounded-full px-5 py-3 text-sm font-semibold">
                      Save
                    </button>
                  )}
                  <button type="button" onClick={() => setOpen(false)} className="glass hairline rounded-full px-5 py-3 text-sm font-semibold">
                    Close
                  </button>
                </div>
              </m.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
