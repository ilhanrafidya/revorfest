"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { changePin, updateProfile } from "@/app/actions/profile";
import { getTakenNumbers } from "@/app/actions/join";
import { logout } from "@/app/actions/auth";
import { AvatarInput } from "./avatar-input";
import { NumberPicker } from "./number-picker";
import { PositionPicker } from "./position-picker";
import { Button, ErrorText, Field, Input } from "./ui";
import type { Position } from "@/lib/positions";

export type ProfileInitial = {
  id: string;
  name: string;
  gamertag: string;
  number: number;
  primary: Position;
  secondary: Position[];
  avatar: string | null;
};

export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [gamertag, setGamertag] = useState(initial.gamertag);
  const [number, setNumber] = useState<number | null>(initial.number);
  const [primary, setPrimary] = useState<Position | null>(initial.primary);
  const [secondary, setSecondary] = useState<Position[]>(initial.secondary);
  const [avatar, setAvatar] = useState<Blob | null>(null);
  const [taken, setTaken] = useState<{ number: number; name: string; id: string }[]>([]);
  const [showNumbers, setShowNumbers] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const [curPin, setCurPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (showNumbers) getTakenNumbers().then(setTaken);
  }, [showNumbers]);

  function save() {
    const form = new FormData();
    form.set("name", name);
    form.set("gamertag", gamertag);
    form.set("number", String(number));
    form.set("primary", primary ?? "");
    form.set("secondary", secondary.join(","));
    if (avatar) form.set("avatar", avatar, avatar.type === "image/webp" ? "avatar.webp" : "avatar.jpg");
    startTransition(async () => {
      const res = await updateProfile(form);
      if (res.ok) {
        setMsg({ ok: true, text: "Saved." });
        router.push(`/squad/${res.slug}`);
        router.refresh();
      } else setMsg({ ok: false, text: res.error });
    });
  }

  function savePin() {
    startTransition(async () => {
      const res = await changePin(curPin, newPin);
      setPinMsg(res.ok ? { ok: true, text: "PIN updated." } : { ok: false, text: res.error });
      if (res.ok) {
        setCurPin("");
        setNewPin("");
      }
    });
  }

  return (
    <div className="space-y-10">
      <div className="tile space-y-6 p-6 md:p-8">
        <AvatarInput name={name} initialSrc={initial.avatar} onChange={setAvatar} />
        <Field label="Display name">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
        </Field>
        <Field label="EA ID / Gamertag" hint="Exactly as in-game.">
          <Input value={gamertag} onChange={(e) => setGamertag(e.target.value)} maxLength={32} autoCapitalize="off" spellCheck={false} />
        </Field>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Jersey number</span>
            <button type="button" onClick={() => setShowNumbers((v) => !v)} className="text-sm font-semibold text-accent">
              {showNumbers ? "Done" : `#${number} · Change`}
            </button>
          </div>
          {showNumbers && <NumberPicker value={number} onChange={setNumber} taken={taken} ownId={initial.id} />}
        </div>
        <div>
          <span className="mb-2 block text-sm font-medium">Positions</span>
          <PositionPicker
            primary={primary}
            secondary={secondary}
            onChange={(p, s) => {
              setPrimary(p);
              setSecondary(s);
            }}
          />
        </div>
        {msg && (msg.ok ? <p className="text-sm text-accent">{msg.text}</p> : <ErrorText>{msg.text}</ErrorText>)}
        <Button className="w-full" onClick={save} disabled={pending || !primary || !number}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>

      <div className="tile space-y-5 p-6 md:p-8">
        <p className="text-lg font-semibold">Change PIN</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current PIN">
            <Input
              value={curPin}
              onChange={(e) => setCurPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              type="password"
              className="text-center tracking-[0.5em]"
            />
          </Field>
          <Field label="New PIN">
            <Input
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              type="password"
              className="text-center tracking-[0.5em]"
            />
          </Field>
        </div>
        {pinMsg && (pinMsg.ok ? <p className="text-sm text-accent">{pinMsg.text}</p> : <ErrorText>{pinMsg.text}</ErrorText>)}
        <Button variant="ghost" className="w-full" onClick={savePin} disabled={pending || curPin.length !== 4 || newPin.length !== 4}>
          Update PIN
        </Button>
      </div>

      <form action={logout}>
        <Button variant="danger" className="w-full" type="submit">
          Log out
        </Button>
      </form>
    </div>
  );
}
