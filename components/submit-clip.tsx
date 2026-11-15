"use client";

import { useState, useTransition } from "react";
import { submitClip } from "@/app/actions/showdown";
import { parseClipUrl } from "@/lib/clip-url";
import { Button, ErrorText, Field, Input } from "./ui";

export function SubmitClip({ category, players }: { category: "gotw" | "notw"; players: { id: string; name: string; number: number }[] }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [featuring, setFeaturing] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const valid = !!parseClipUrl(url);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className={category === "notw" ? "bg-depleted text-white" : ""}>
        + Submit a {category === "gotw" ? "worldie" : "nyunda moment"}
      </Button>
    );
  }

  return (
    <div className="tile space-y-4 p-5 md:p-6">
      <p className="text-lg font-semibold">{category === "gotw" ? "Submit a Goal of the Week" : "Submit a Nyunda of the Week"}</p>
      <Field label="Clip link" hint="YouTube, Streamable or TikTok.">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" autoCapitalize="off" />
      </Field>
      <Field label="One-line banter" hint="Max 120 characters.">
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120} placeholder={category === "gotw" ? "Top bins from 30 yards 🔥" : "Missed an open goal. Again."} />
      </Field>
      <Field label="Who's in it? (optional)">
        <select value={featuring} onChange={(e) => setFeaturing(e.target.value)} className="hairline w-full rounded-2xl bg-white/[0.05] px-4 py-3.5 text-base">
          <option value="">—</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.number} {p.name}
            </option>
          ))}
        </select>
      </Field>
      <ErrorText>{error}</ErrorText>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          disabled={!valid || pending}
          onClick={() =>
            startTransition(async () => {
              const res = await submitClip(category, url, caption, featuring);
              if (res.ok) {
                setUrl("");
                setCaption("");
                setFeaturing("");
                setOpen(false);
                setError(null);
              } else setError(res.error);
            })
          }
        >
          {pending ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </div>
  );
}
