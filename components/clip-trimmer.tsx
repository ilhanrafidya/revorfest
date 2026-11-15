"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_CLIP_SEC, MIN_CLIP_SEC } from "@/lib/trim-clip";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const FRAMES = 10;

/** Grabs evenly spaced frames from the video for the timeline filmstrip. */
async function filmstrip(src: string, dur: number, onFrame: (i: number, url: string) => void) {
  const v = document.createElement("video");
  v.src = src;
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  await new Promise<void>((res, rej) => {
    v.onloadeddata = () => res();
    v.onerror = () => rej();
    v.load();
  });
  const c = document.createElement("canvas");
  const h = 72;
  c.height = h;
  c.width = Math.max(1, Math.round((h * (v.videoWidth || 16)) / (v.videoHeight || 9)));
  const ctx = c.getContext("2d")!;
  for (let i = 0; i < FRAMES; i++) {
    v.currentTime = Math.min(dur - 0.05, ((i + 0.5) / FRAMES) * dur);
    await new Promise<void>((res) => {
      const done = () => res();
      v.onseeked = done;
      setTimeout(done, 1500); // never hang on a stubborn seek
    });
    ctx.drawImage(v, 0, 0, c.width, c.height);
    onFrame(i, c.toDataURL("image/jpeg", 0.6));
  }
  v.removeAttribute("src");
  v.load();
}

/**
 * iOS-style trimmer: a filmstrip of the video with a bright window you drag to pick the moment,
 * plus a length slider (max 15s). The preview loops only the chosen part.
 */
export function ClipTrimmer({ src, onChange }: { src: string; onChange: (r: { start: number; end: number }) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [dur, setDur] = useState(0);
  const [start, setStart] = useState(0);
  const [len, setLen] = useState(MAX_CLIP_SEC);
  const [frames, setFrames] = useState<string[]>([]);
  const maxLen = Math.max(MIN_CLIP_SEC, Math.min(MAX_CLIP_SEC, dur || MAX_CLIP_SEC));
  const L = Math.min(len, maxLen);
  const end = Math.min(dur, start + L);

  useEffect(() => onChange({ start, end }), [start, end, onChange]);

  useEffect(() => {
    if (!dur) return;
    let live = true;
    setFrames([]);
    filmstrip(src, dur, (i, url) => {
      if (live) setFrames((f) => {
        const n = [...f];
        n[i] = url;
        return n;
      });
    }).catch(() => null);
    return () => {
      live = false;
    };
  }, [src, dur]);

  // loop the selected window
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const tick = () => {
      if (drag.current) return;
      if (v.currentTime < start - 0.25 || v.currentTime >= end) v.currentTime = start;
    };
    v.addEventListener("timeupdate", tick);
    return () => v.removeEventListener("timeupdate", tick);
  }, [start, end]);


  // ---- custom drag (native range inputs on iOS only move when you hit the tiny thumb) ----
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ grab: number; id: number; at: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const lastSeek = useRef(0);

  function secAt(clientX: number) {
    const r = track.current!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * dur;
  }
  function clampStart(s: number) {
    return Math.min(Math.max(0, s), Math.max(0, dur - L));
  }
  function seekPreview(t: number, force = false) {
    const v = ref.current;
    if (!v) return;
    const now = performance.now();
    if (!force && now - lastSeek.current < 120) return; // throttle seeks while dragging
    lastSeek.current = now;
    const fast = (v as HTMLVideoElement & { fastSeek?: (t: number) => void }).fastSeek;
    if (fast && !force) fast.call(v, t);
    else v.currentTime = t;
  }
  function onDown(e: React.PointerEvent) {
    if (!dur) return;
    const t = secAt(e.clientX);
    // grabbing inside the window keeps the finger's offset; tapping outside centres the window there
    const inside = t >= start && t <= start + L;
    const grab = inside ? t - start : L / 2;
    if (!inside) {
      const ns = clampStart(t - grab);
      setStart(ns);
      seekPreview(ns, true);
    }
    drag.current = { grab, id: e.pointerId, at: inside ? start : clampStart(t - grab) };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ref.current?.pause();
    setDragging(true);
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    const ns = clampStart(secAt(e.clientX) - drag.current.grab);
    drag.current.at = ns;
    setStart(ns);
    seekPreview(ns);
  }
  function onUp(e: React.PointerEvent) {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    const at = drag.current.at;
    drag.current = null;
    setDragging(false);
    const v = ref.current;
    if (v) {
      v.currentTime = at;
      v.play().catch(() => null);
    }
  }

  const left = dur ? (start / dur) * 100 : 0;
  const width = dur ? (L / dur) * 100 : 100;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-black">
        <video
          ref={ref}
          src={src}
          className="max-h-[45svh] w-full object-contain"
          playsInline
          muted
          autoPlay
          loop
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            setDur(Number.isFinite(d) ? d : 0);
            setLen(Math.min(MAX_CLIP_SEC, Number.isFinite(d) ? d : MAX_CLIP_SEC));
          }}
        />
      </div>
      {dur > 0 && (
        <>
          <div
            ref={track}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className={`relative h-14 touch-none select-none overflow-hidden rounded-xl bg-white/[0.06] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ WebkitUserSelect: "none" }}
          >
            {/* filmstrip */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: FRAMES }, (_, i) =>
                frames[i] ? (
                  <img key={i} src={frames[i]} alt="" className="pointer-events-none h-full min-w-0 flex-1 object-cover" draggable={false} />
                ) : (
                  <span key={i} className="h-full flex-1 animate-pulse bg-white/[0.05]" />
                ),
              )}
            </div>
            {/* dim everything outside the chosen part */}
            <div className="pointer-events-none absolute inset-y-0 left-0 bg-black/65" style={{ width: `${left}%` }} />
            <div className="pointer-events-none absolute inset-y-0 right-0 bg-black/65" style={{ width: `${Math.max(0, 100 - left - width)}%` }} />
            {/* chosen part */}
            <div
              className={`pointer-events-none absolute inset-y-0 rounded-xl border-[3px] border-accent shadow-[0_0_0_1px_rgba(0,0,0,0.4),0_0_18px_color-mix(in_oklab,var(--accent)_45%,transparent)] transition-transform ${dragging ? "scale-y-[1.04]" : ""}`}
              style={{ left: `${left}%`, width: `${width}%` }}
            >
              <span className="absolute inset-y-2 left-0.5 w-1 rounded-full bg-accent" />
              <span className="absolute inset-y-2 right-0.5 w-1 rounded-full bg-accent" />
            </div>

          </div>
          <div className="flex items-center justify-between text-xs text-mute">
            <span className="tabular-nums">
              {fmt(start)} – {fmt(end)}
            </span>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-semibold tabular-nums text-accent">{L.toFixed(1)}s</span>
            <span className="tabular-nums">{fmt(dur)}</span>
          </div>
          {dur > MIN_CLIP_SEC && (
            <label className="block text-xs text-mute">
              Length
              <input
                type="range"
                min={MIN_CLIP_SEC}
                max={maxLen}
                step={0.5}
                value={L}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setLen(n);
                  if (start + n > dur) setStart(Math.max(0, dur - n));
                }}
                className="mt-1 w-full accent-[var(--accent)]"
              />
            </label>
          )}
          <p className="text-xs text-mute">Drag the box (or tap the strip) to pick your moment · max {MAX_CLIP_SEC}s</p>
        </>
      )}
    </div>
  );
}
