"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { submitClip } from "@/app/actions/showdown";
import { parseClipUrl } from "@/lib/clip-url";
import { MAX_CLIP_SEC, QUALITY_LADDER, canTrim, trimClip } from "@/lib/trim-clip";
import { ClipTrimmer } from "./clip-trimmer";
import { Button, ErrorText, Field, Input } from "./ui";

const MAX_UPLOAD = 4_300_000;
const TARGET = 3_200_000; // aim for ~2–3 MB: light on storage and on everyone’s data

export function SubmitClip({ category, players }: { category: "gotw" | "notw"; players: { id: string; name: string; number: number }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [featuring, setFeaturing] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // upload state
  const [src, setSrc] = useState<string | null>(null);
  const range = useRef({ start: 0, end: MAX_CLIP_SEC });
  const [stage, setStage] = useState<null | "trimming" | "uploading">(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (src) URL.revokeObjectURL(src);
  }, [src]);

  const onRange = useCallback((r: { start: number; end: number }) => {
    range.current = r;
  }, []);

  function reset() {
    setUrl("");
    setCaption("");
    setFeaturing("");
    setError(null);
    if (src) URL.revokeObjectURL(src);
    setSrc(null);
    setStage(null);
    setProgress(0);
    setOpen(false);
  }

  async function submitUpload() {
    if (!src) return;
    setError(null);
    try {
      let video: File;
      let poster: File | null = null;
      if (canTrim()) {
        setStage("trimming");
        let smallest: File | null = null;
        let firstPoster: File | null = null;
        for (const [i, q] of QUALITY_LADDER.entries()) {
          setProgress(0);
          const r = await trimClip(src, range.current.start, range.current.end, setProgress, q);
          if (i === 0) firstPoster = r.poster;
          if (!smallest || r.video.size < smallest.size) smallest = r.video;
          if (r.video.size <= TARGET) break; // small enough — done
        }
        video = smallest as File;
        poster = firstPoster;
      } else {
        // very old browsers: send the original if it's already small enough
        const raw = await fetch(src).then((x) => x.blob());
        video = new File([raw], "clip.mp4", { type: raw.type || "video/mp4" });
      }
      if (video.size > MAX_UPLOAD) throw new Error("Still too big — pick a shorter part.");
      setStage("uploading");
      const fd = new FormData();
      fd.set("video", video);
      if (poster) fd.set("poster", poster);
      fd.set("category", category);
      fd.set("caption", caption);
      fd.set("featuring", featuring);
      const res = await fetch("/api/clips/upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Upload failed — try again.");
      reset();
      router.refresh();
    } catch (e) {
      setStage(null);
      setError((e as Error).message || "Something went wrong.");
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className={category === "notw" ? "bg-depleted text-white" : ""}>
        + Submit a {category === "gotw" ? "worldie" : "nyunda moment"}
      </Button>
    );
  }

  const busy = pending || !!stage;

  return (
    <div className="tile space-y-4 p-5 md:p-6">
      <p className="text-lg font-semibold">{category === "gotw" ? "Submit a Goal of the Week" : "Submit a Nyunda of the Week"}</p>

      <div className="grid grid-cols-2 gap-1 rounded-full bg-white/[0.06] p-1 text-sm font-semibold">
        {(["upload", "link"] as const).map((m) => (
          <button
            key={m}
            type="button"
            disabled={busy}
            onClick={() => setMode(m)}
            className={`rounded-full py-2 transition ${mode === m ? "bg-chalk text-black" : "text-mute"}`}
          >
            {m === "upload" ? "Upload video" : "Paste link"}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        src ? (
          <div className="space-y-3">
            <ClipTrimmer src={src} onChange={onRange} />
            {!busy && (
              <button type="button" onClick={() => fileRef.current?.click()} className="text-sm font-semibold text-accent">
                Choose a different video
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-10 text-center transition active:scale-[0.99]"
          >
            <svg viewBox="0 0 24 24" className="size-8 text-accent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="M10 9.5l4.5 2.5L10 14.5z" fill="currentColor" />
            </svg>
            <span className="font-semibold">Choose a video</span>
            <span className="text-xs text-mute">From your gallery or PS App download · you&apos;ll pick up to {MAX_CLIP_SEC}s</span>
          </button>
        )
      ) : (
        <Field label="Clip link" hint="YouTube, Streamable or TikTok.">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" autoCapitalize="off" />
        </Field>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (src) URL.revokeObjectURL(src);
          setSrc(URL.createObjectURL(f));
          setError(null);
        }}
      />

      <Field label="One-line banter" hint="Max 120 characters.">
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120} placeholder={category === "gotw" ? "Top bins from 30 yards 🔥" : "Missed an open goal. Again."} />
      </Field>
      <Field label="Dedicated to" hint={category === "gotw" ? "They take the Goal of the Week if it wins." : "They wear the Nyunda of the Week crown if it wins 😭"}>
        <select value={featuring} onChange={(e) => setFeaturing(e.target.value)} className={`hairline w-full rounded-2xl bg-white/[0.05] px-4 py-3.5 text-base ${featuring ? "" : "text-mute"}`}>
          <option value="" disabled>
            Pick a teammate
          </option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.number} {p.name}
            </option>
          ))}
        </select>
      </Field>

      {stage && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${stage === "uploading" ? 100 : Math.round(progress * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-mute">{stage === "trimming" ? "Trimming &amp; compressing on your phone… keep the app open" : "Uploading…"}</p>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-3">
        <Button variant="ghost" className="shrink-0" disabled={busy} onClick={reset}>
          Cancel
        </Button>
        {mode === "upload" ? (
          <>
            <Button className="flex-1 whitespace-nowrap" disabled={!src || !featuring || busy} onClick={submitUpload}>
              {stage === "trimming" ? "Trimming…" : stage === "uploading" ? "Uploading…" : "Submit clip"}
            </Button>
          </>
        ) : (
          <Button
            className="flex-1 whitespace-nowrap"
            disabled={!parseClipUrl(url) || !featuring || busy}
            onClick={() =>
              startTransition(async () => {
                const res = await submitClip(category, url, caption, featuring);
                if (res.ok) reset();
                else setError(res.error);
              })
            }
          >
            {pending ? "Submitting…" : "Submit"}
          </Button>
        )}
      </div>
    </div>
  );
}
