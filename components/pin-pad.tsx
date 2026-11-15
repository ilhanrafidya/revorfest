"use client";

import { m, useAnimationControls } from "motion/react";
import { useCallback, useEffect, useState } from "react";

/** 4-digit PIN entry with an on-screen keypad (also accepts the keyboard). */
export function PinPad({
  onComplete,
  disabled = false,
  error,
  resetKey = 0,
}: {
  onComplete: (pin: string) => void;
  disabled?: boolean;
  error?: string | null;
  resetKey?: number;
}) {
  const [pin, setPin] = useState("");
  const shake = useAnimationControls();

  useEffect(() => {
    setPin("");
  }, [resetKey]);

  useEffect(() => {
    if (error) shake.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.4 } });
  }, [error, resetKey, shake]);

  const press = useCallback(
    (d: string) => {
      if (disabled) return;
      if (d === "back") return setPin(pin.slice(0, -1));
      if (pin.length >= 4) return;
      const next = pin + d;
      setPin(next);
      if (next.length === 4) setTimeout(() => onComplete(next), 120);
    },
    [disabled, onComplete, pin],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("back");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  return (
    <div className="mx-auto w-full max-w-[300px]">
      <m.div animate={shake} className="mb-8 flex justify-center gap-4">
        {[0, 1, 2, 3].map((i) => (
          <m.span
            key={i}
            animate={{ scale: i < pin.length ? 1.15 : 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className={`size-4 rounded-full transition-colors duration-200 ${
              i < pin.length ? (error ? "bg-depleted" : "bg-accent") : "bg-white/15"
            }`}
          />
        ))}
      </m.div>
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"].map((d, i) =>
          d === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => press(d)}
              aria-label={d === "back" ? "Delete" : d}
              className="glass hairline grid aspect-square place-items-center rounded-full text-2xl font-medium transition active:scale-90 active:bg-white/20 disabled:opacity-40"
            >
              {d === "back" ? (
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z" />
                  <path d="m12 9 6 6m0-6-6 6" />
                </svg>
              ) : (
                d
              )}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
