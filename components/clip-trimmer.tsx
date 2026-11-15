"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_CLIP_SEC, MIN_CLIP_SEC } from "@/lib/trim-clip";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * Pick up to 15s from a video: the highlighted window can be dragged along the timeline,
 * and its length set with the second slider. The preview loops just that window.
 */
export function ClipTrimmer({ src, onChange }: { src: string; onChange: (r: { start: number; end: number }) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [dur, setDur] = useState(0);
  const [start, setStart] = useState(0);
  const [len, setLen] = useState(MAX_CLIP_SEC);
  const maxLen = Math.max(MIN_CLIP_SEC, Math.min(MAX_CLIP_SEC, dur || MAX_CLIP_SEC));
  const L = Math.min(len, maxLen);
  const end = Math.min(dur, start + L);

  useEffect(() => onChange({ start, end }), [start, end, onChange]);

  // loop the selected window
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const tick = () => {
      if (v.currentTime < start || v.currentTime >= end) v.currentTime = start;
    };
    v.addEventListener("timeupdate", tick);
    return () => v.removeEventListener("timeupdate", tick);
  }, [start, end]);

  useEffect(() => {
    const v = ref.current;
    if (v && dur) v.currentTime = start;
  }, [start, dur]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-black">
        <video
          ref={ref}
          src={src}
          className="max-h-[50svh] w-full object-contain"
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
          <div className="relative h-10 rounded-xl bg-white/[0.06]">
            <div
              className="absolute inset-y-0 rounded-xl border-2 border-accent bg-accent/20"
              style={{ left: `${(start / dur) * 100}%`, width: `${(L / dur) * 100}%` }}
            />
            <input
              type="range"
              aria-label="Clip start"
              min={0}
              max={Math.max(0, dur - L)}
              step={0.1}
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
              className="absolute inset-0 size-full cursor-grab opacity-0"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-mute">
            <span>
              {fmt(start)} – {fmt(end)}
            </span>
            <span className="font-semibold text-chalk">{L.toFixed(1)}s</span>
            <span>{fmt(dur)}</span>
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
          <p className="text-xs text-mute">Drag the highlighted part to choose your moment (max {MAX_CLIP_SEC}s).</p>
        </>
      )}
    </div>
  );
}
