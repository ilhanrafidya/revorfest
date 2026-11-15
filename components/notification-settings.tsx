"use client";

import { useEffect, useState } from "react";
import { currentSubscription, disablePush, enablePush, isIOS, isStandalone, pushSupported } from "@/lib/push-client";

type S = "loading" | "on" | "off" | "denied" | "unsupported" | "ios-install";

/** Notification on/off + test, on the My profile page. */
export function NotificationSettings({ publicKey }: { publicKey: string | null }) {
  const [s, setS] = useState<S>("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!pushSupported()) return setS(isIOS() && !isStandalone() ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setS("denied");
      setS(Notification.permission === "granted" && (await currentSubscription()) ? "on" : "off");
    })();
  }, []);

  async function on() {
    if (!publicKey) return;
    setBusy(true);
    const r = await enablePush(publicKey);
    setBusy(false);
    setS(r === "on" ? "on" : r === "denied" ? "denied" : "off");
    if (r === "error") setNote("Couldn't turn on — try again.");
  }
  async function off() {
    setBusy(true);
    await disablePush();
    setBusy(false);
    setS("off");
  }
  async function test() {
    setNote(null);
    const r = await fetch("/api/push/test", { method: "POST" }).then((x) => x.json()).catch(() => null);
    setNote(r?.sent ? "Sent — check your notifications." : "Nothing sent. Try turning notifications off and on.");
  }

  return (
    <div className="tile mb-8 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold">Notifications</p>
          <p className="mt-0.5 text-xs text-mute">
            {s === "on" && "On for this device · matchdays, weekly & season awards"}
            {s === "off" && "Off on this device"}
            {s === "denied" && "Blocked — allow Revorfest in your phone's notification settings"}
            {s === "unsupported" && "This browser can't receive notifications"}
            {s === "ios-install" && "On iPhone: Share → Add to Home Screen, then open it from there"}
            {s === "loading" && "Checking…"}
          </p>
        </div>
        {(s === "on" || s === "off") && (
          <button
            type="button"
            role="switch"
            aria-checked={s === "on"}
            disabled={busy}
            onClick={s === "on" ? off : on}
            className={`relative h-8 w-14 shrink-0 rounded-full transition ${s === "on" ? "bg-accent" : "bg-white/15"}`}
          >
            <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${s === "on" ? "left-7" : "left-1"}`} />
          </button>
        )}
      </div>
      {s === "on" && (
        <button type="button" onClick={test} className="mt-4 rounded-full bg-white/[0.08] px-4 py-2 text-sm font-semibold">
          Send me a test
        </button>
      )}
      {note && <p className="mt-3 text-xs text-mute">{note}</p>}
    </div>
  );
}
