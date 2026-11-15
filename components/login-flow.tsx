"use client";

import { AnimatePresence, m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { loginWithPin } from "@/app/actions/auth";
import { PinPad } from "./pin-pad";
import { PlayerAvatar } from "./player-avatar";
import { EASE } from "@/lib/motion";

export type LoginPlayer = { id: string; name: string; number: number; avatar: string | null };

export function LoginFlow({ players }: { players: LoginPlayer[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<LoginPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [pending, startTransition] = useTransition();

  const onPin = useCallback(
    (pin: string) => {
      if (!picked) return;
      startTransition(async () => {
        const res = await loginWithPin(picked.id, pin);
        if (res.ok) {
          router.push(`/squad/${res.slug}`);
          router.refresh();
        } else {
          setError(res.error);
          setResetKey((k) => k + 1);
        }
      });
    },
    [picked, router],
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-40 pt-24 md:pt-32">
      <AnimatePresence mode="wait" initial={false}>
        {!picked ? (
          <m.div
            key="pick"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <div className="text-center">
              <p className="eyebrow">Locker room</p>
              <h1 className="text-display mt-2 text-4xl md:text-6xl">Who&apos;s this?</h1>
              <p className="mt-3 text-mute">Tap your face, then enter your PIN.</p>
            </div>
            {players.length === 0 ? (
              <p className="mt-12 text-center text-mute">
                No players yet.{" "}
                <Link href="/join" className="font-semibold text-accent">
                  Be the first to join →
                </Link>
              </p>
            ) : (
              <div className="mt-10 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4">
                {players.map((p, i) => (
                  <m.button
                    key={p.id}
                    type="button"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE, delay: Math.min(i * 0.03, 0.4) }}
                    onClick={() => {
                      setError(null);
                      setPicked(p);
                    }}
                    className="group flex flex-col items-center gap-2"
                  >
                    <m.div layoutId={`login-${p.id}`} className="rounded-full">
                      <PlayerAvatar
                        name={p.name}
                        src={p.avatar}
                        className="size-20 text-xl transition group-hover:ring-2 group-hover:ring-accent group-active:scale-95 md:size-24"
                      />
                    </m.div>
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="-mt-1.5 text-xs tabular-nums text-mute">#{p.number}</span>
                  </m.button>
                ))}
              </div>
            )}
            <p className="mt-12 text-center text-sm text-mute">
              New to the squad?{" "}
              <Link href="/join" className="font-semibold text-accent">
                Join with the invite code
              </Link>
            </p>
          </m.div>
        ) : (
          <m.div
            key="pin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <m.div layoutId={`login-${picked.id}`} className="rounded-full">
              <PlayerAvatar name={picked.name} src={picked.avatar} className="size-28 text-3xl" />
            </m.div>
            <h1 className="text-display mt-5 text-4xl">{picked.name}</h1>
            <p className="mb-8 mt-1 text-sm tabular-nums text-mute">#{picked.number}</p>
            <PinPad onComplete={onPin} disabled={pending} error={error} resetKey={resetKey} />
            <div className="mt-6 min-h-10 text-center text-sm">
              {pending ? <span className="text-mute">Checking…</span> : error ? <span className="text-depleted">{error}</span> : null}
            </div>
            <button type="button" onClick={() => setPicked(null)} className="mt-2 text-sm text-mute hover:text-chalk">
              Not you?
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
