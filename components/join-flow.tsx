"use client";

import { AnimatePresence, m } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { checkInvite, getTakenNumbers, register } from "@/app/actions/join";
import { AvatarInput } from "./avatar-input";
import { NumberPicker } from "./number-picker";
import { PinPad } from "./pin-pad";
import { PositionPicker } from "./position-picker";
import { Button, ErrorText, Field, Input } from "./ui";
import type { Position } from "@/lib/positions";
import { EASE } from "@/lib/motion";

const STEPS = ["Invite", "You", "Number", "Positions", "PIN"];

export function JoinFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [gamertag, setGamertag] = useState("");
  const [avatar, setAvatar] = useState<Blob | null>(null);
  const [number, setNumber] = useState<number | null>(null);
  const [taken, setTaken] = useState<{ number: number; name: string; id: string }[]>([]);
  const [primary, setPrimary] = useState<Position | null>(null);
  const [secondary, setSecondary] = useState<Position[]>([]);
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [pinKey, setPinKey] = useState(0);

  const go = (to: number) => {
    setError(null);
    setDir(to > step ? 1 : -1);
    setStep(to);
  };

  // Live jersey availability while picking a number.
  useEffect(() => {
    if (step !== 2) return;
    let alive = true;
    const load = () => getTakenNumbers().then((t) => alive && setTaken(t));
    load();
    const id = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [step]);

  useEffect(() => {
    if (number && taken.some((t) => t.number === number)) {
      setError(`#${number} was just taken by ${taken.find((t) => t.number === number)?.name}. Pick another.`);
      setNumber(null);
    }
  }, [taken, number]);

  function submitCode() {
    startTransition(async () => {
      const res = await checkInvite(code);
      if (res.ok) go(1);
      else setError(res.error);
    });
  }

  const onPin = useCallback(
    (pin: string) => {
      if (!firstPin) {
        setFirstPin(pin);
        setError(null);
        setPinKey((k) => k + 1);
        return;
      }
      if (pin !== firstPin) {
        setFirstPin(null);
        setError("PINs didn't match. Start again.");
        setPinKey((k) => k + 1);
        return;
      }
      const form = new FormData();
      form.set("name", name);
      form.set("gamertag", gamertag);
      form.set("number", String(number));
      form.set("primary", primary ?? "");
      form.set("secondary", secondary.join(","));
      form.set("pin", pin);
      if (avatar) form.set("avatar", avatar, avatar.type === "image/webp" ? "avatar.webp" : "avatar.jpg");
      startTransition(async () => {
        const res = await register(form);
        if (res.ok) {
          router.push(`/squad/${res.slug}?welcome=1`);
          router.refresh();
        } else {
          setError(res.error);
          setFirstPin(null);
          setPinKey((k) => k + 1);
          if (res.error.includes("taken")) go(2);
          if (res.error.includes("EA ID")) go(1);
          if (res.error.includes("invite")) go(0);
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firstPin, name, gamertag, number, primary, secondary, avatar, router],
  );

  return (
    <div className="mx-auto w-full max-w-lg px-5 pb-40 pt-24 md:pt-32">
      {/* progress */}
      <div className="mb-10 flex items-center gap-3">
        <button
          type="button"
          onClick={() => step > 0 && go(step - 1)}
          disabled={step === 0 || pending}
          className="glass hairline grid size-10 shrink-0 place-items-center rounded-full transition disabled:opacity-0"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="flex flex-1 gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <m.div
                className="h-full bg-accent"
                initial={false}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.5, ease: EASE }}
              />
            </div>
          ))}
        </div>
        <span className="w-16 text-right text-xs text-mute">
          {step + 1}/{STEPS.length}
        </span>
      </div>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <m.div
          key={step}
          custom={dir}
          initial={{ opacity: 0, x: dir * 40, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, x: dir * -40, filter: "blur(6px)" }}
          transition={{ duration: 0.4, ease: EASE }}
          className="space-y-6"
        >
          {step === 0 && (
            <>
              <Header eyebrow="Join the club" title="Got the code?" sub="Your captain shares the Revorfest invite code." />
              <Input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && code && submitCode()}
                placeholder="INVITE CODE"
                autoCapitalize="characters"
                autoComplete="off"
                className="text-center text-2xl font-semibold tracking-[0.3em]"
              />
              <ErrorText>{error}</ErrorText>
              <Button className="w-full" onClick={submitCode} disabled={!code || pending}>
                {pending ? "Checking…" : "Continue"}
              </Button>
            </>
          )}

          {step === 1 && (
            <>
              <Header eyebrow="Step 2" title="Who are you?" sub="This is how the squad sees you." />
              <AvatarInput name={name} onChange={setAvatar} />
              <Field label="Display name">
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="e.g. Logic" />
              </Field>
              <Field label="EA ID / Gamertag" hint="Exactly as it appears in-game — we use it to link your EA stats.">
                <Input
                  value={gamertag}
                  onChange={(e) => setGamertag(e.target.value)}
                  maxLength={32}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Your EA ID"
                />
              </Field>
              <ErrorText>{error}</ErrorText>
              <Button className="w-full" onClick={() => go(2)} disabled={name.trim().length < 2 || gamertag.trim().length < 2}>
                Continue
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Header
                eyebrow="Step 3"
                title={number ? `#${number}` : "Pick your number."}
                sub="Crossed-out numbers are already claimed. Updates live."
              />
              <NumberPicker value={number} onChange={(n) => { setError(null); setNumber(n); }} taken={taken} />
              <ErrorText>{error}</ErrorText>
              <Button className="w-full" onClick={() => go(3)} disabled={!number}>
                Continue
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Header eyebrow="Step 4" title="Where do you play?" />
              <PositionPicker
                primary={primary}
                secondary={secondary}
                onChange={(p, s) => {
                  setPrimary(p);
                  setSecondary(s);
                }}
              />
              <ErrorText>{error}</ErrorText>
              <Button className="w-full" onClick={() => go(4)} disabled={!primary}>
                Continue
              </Button>
            </>
          )}

          {step === 4 && (
            <>
              <Header
                eyebrow="Last step"
                title={firstPin ? "Confirm your PIN." : "Create a PIN."}
                sub="4 digits. You'll use it with your photo to log in."
              />
              <PinPad onComplete={onPin} disabled={pending} error={error} resetKey={pinKey} />
              <div className="min-h-12 text-center">
                {pending ? <p className="text-sm text-mute">Creating your profile…</p> : <ErrorText>{error}</ErrorText>}
              </div>
            </>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
}

function Header({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="text-display mt-2 text-4xl md:text-5xl">{title}</h1>
      {sub && <p className="mx-auto mt-3 max-w-sm text-mute">{sub}</p>}
    </div>
  );
}
