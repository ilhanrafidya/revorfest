"use client";

import { POSITION_GROUPS, type Position } from "@/lib/positions";

export function PositionPicker({
  primary,
  secondary,
  onChange,
}: {
  primary: Position | null;
  secondary: Position[];
  onChange: (primary: Position | null, secondary: Position[]) => void;
}) {
  function tap(p: Position) {
    if (primary === p) return onChange(null, secondary);
    if (secondary.includes(p)) return onChange(primary, secondary.filter((s) => s !== p));
    if (!primary) return onChange(p, secondary);
    if (secondary.length < 3) return onChange(primary, [...secondary, p]);
  }

  return (
    <div className="space-y-5 text-left">
      <p className="text-sm text-mute">
        Tap your <span className="font-semibold text-accent">main</span> position first, then up to 3{" "}
        <span className="font-semibold text-chalk">secondary</span> ones.
      </p>
      {POSITION_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="eyebrow mb-2">{g.label}</p>
          <div className="flex flex-wrap gap-2">
            {g.items.map((p) => {
              const isMain = primary === p;
              const isSub = secondary.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => tap(p)}
                  className={`min-w-16 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${
                    isMain
                      ? "bg-accent text-on-accent"
                      : isSub
                        ? "bg-white/20 text-chalk ring-1 ring-white/30"
                        : "bg-white/[0.06] text-mute hover:text-chalk"
                  }`}
                >
                  {p}
                  {isMain && <span className="ml-1.5 text-[10px] uppercase opacity-70">main</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
