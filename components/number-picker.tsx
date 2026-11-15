"use client";

import { m } from "motion/react";

export function NumberPicker({
  value,
  onChange,
  taken,
  ownId,
}: {
  value: number | null;
  onChange: (n: number) => void;
  taken: { number: number; name: string; id: string }[];
  ownId?: string;
}) {
  const byNumber = new Map(taken.filter((t) => t.id !== ownId).map((t) => [t.number, t.name]));
  return (
    <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
      {Array.from({ length: 99 }, (_, i) => i + 1).map((n) => {
        const owner = byNumber.get(n);
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            disabled={!!owner}
            title={owner ? `Taken by ${owner}` : `#${n}`}
            onClick={() => onChange(n)}
            className={`relative grid aspect-square place-items-center rounded-xl text-sm font-semibold tabular-nums transition ${
              owner
                ? "cursor-not-allowed bg-white/[0.03] text-mute/40 line-through"
                : selected
                  ? "text-on-accent"
                  : "bg-white/[0.06] text-chalk hover:bg-white/[0.12]"
            }`}
          >
            {selected && (
              <m.span
                layoutId="number-pick"
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className="absolute inset-0 rounded-xl bg-accent"
              />
            )}
            <span className="relative">{n}</span>
          </button>
        );
      })}
    </div>
  );
}
