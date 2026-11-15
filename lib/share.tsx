import "server-only";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { db } from "./db";

// Instagram story canvas.
export const STORY = { width: 1080, height: 1920 } as const;
export const C = {
  bg: "#050505",
  chalk: "#F5F5F7",
  mute: "#86868B",
  dim: "#6E6E73",
  volt: "#D7FF3A",
  gold: "#DDB168",
  goldHi: "#F2CF8A",
  red: "#FF453A",
};

/** Fetches a file from our own /public as a data URI (Satori needs inline images). */
export async function asset(req: Request, path: string) {
  // Per-deployment URLs sit behind Vercel auth (they'd return an HTML login page), so prefer the public production domain.
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const bases = [prod ? `https://${prod}` : null, req.url].filter(Boolean) as string[];
  for (const base of bases) {
    try {
      const res = await fetch(new URL(path, base));
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) continue;
      return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function remoteImage(url: string | null) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/") || type.includes("webp")) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/** Player avatar as a data URI (JPEG/PNG only — Satori can't decode WebP). */
export async function avatarData(playerId: string | null) {
  if (!playerId) return null;
  const [r] = (await db()`SELECT avatar_b64, avatar_type FROM players WHERE id = ${playerId}`) as {
    avatar_b64: string | null;
    avatar_type: string | null;
  }[];
  return r?.avatar_b64 && r.avatar_type && r.avatar_type !== "image/webp" ? `data:${r.avatar_type};base64,${r.avatar_b64}` : null;
}

/** Shared story frame: glow, crest header, footer. NB Satori: any element with >1 child needs display:flex. */
export function Frame({
  crest,
  eyebrow,
  accent = C.volt,
  glow = "rgba(215,255,58,0.18)",
  children,
}: {
  crest: string | null;
  eyebrow: string;
  accent?: string;
  glow?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: `radial-gradient(90% 45% at 50% 0%, ${glow}, ${C.bg} 70%)`,
        color: C.chalk,
        padding: "150px 70px 130px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {crest ? <img src={crest} width={88} height={88} alt="" /> : <div style={{ display: "flex" }} />}
        <div style={{ display: "flex", fontSize: 34, letterSpacing: 10, fontWeight: 700 }}>{"REVORFEST"}</div>
      </div>
      <div style={{ display: "flex", marginTop: 26, fontSize: 30, letterSpacing: 7, fontWeight: 700, color: accent }}>{eyebrow}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, width: "100%" }}>{children}</div>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: C.mute, letterSpacing: 1 }}>{"#WeAreRevorfest"}</div>
    </div>
  );
}

export function Avatar({ src, name, size, ring }: { src: string | null; name: string; size: number; ring: string }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        border: `8px solid ${ring}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#1C1C1F",
        fontSize: size * 0.36,
        fontWeight: 700,
      }}
    >
      {src ? <img src={src} width={size} height={size} alt="" style={{ objectFit: "cover" }} /> : name.slice(0, 2).toUpperCase()}
    </div>
  );
}

/**
 * Avatar + name + gamertag, with the shirt number huge and faint behind them (painted first, so it
 * sits under the avatar and peeks out around the name).
 */
export function Hero({
  avatar,
  name,
  gamertag,
  number,
  size,
  ring,
  nameColor = C.chalk,
  tint = "rgba(255,255,255,0.07)",
  nameSize = 130,
  marginTop = 90,
}: {
  avatar: string | null;
  name: string;
  gamertag: string | null;
  number: number | null;
  size: number;
  ring: string;
  nameColor?: string;
  tint?: string;
  nameSize?: number;
  marginTop?: number;
}) {
  const fit = name.length > 10 ? Math.round(nameSize * (10 / name.length)) : nameSize;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", marginTop, width: "100%" }}>
      {number != null ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -130, display: "flex", justifyContent: "center", fontSize: 620, fontWeight: 900, letterSpacing: -34, lineHeight: 1, color: tint }}>
          {String(number)}
        </div>
      ) : null}
      <Avatar src={avatar} name={name} size={size} ring={ring} />
      <div style={{ display: "flex", marginTop: 50, fontSize: fit, fontWeight: 800, letterSpacing: -5, lineHeight: 1, color: nameColor }}>{name}</div>
      {gamertag && gamertag.toLowerCase() !== name.toLowerCase() ? (
        <div style={{ display: "flex", marginTop: 16, fontSize: 34, color: C.mute, letterSpacing: 1 }}>{`@${gamertag}`}</div>
      ) : null}
    </div>
  );
}

export function Stat({ label, value, width = 230, color = C.chalk }: { label: string; value: string; width?: number; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width }}>
      <div style={{ display: "flex", fontSize: 84, fontWeight: 800, letterSpacing: -2, color }}>{value}</div>
      <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: C.mute, marginTop: 4 }}>{label}</div>
    </div>
  );
}

type El = { $$typeof: symbol; type: unknown; key: unknown; props: Record<string, unknown> };

/**
 * Satori in Next's ImageResponse chokes on custom function components ("a is not iterable"),
 * so expand them into plain host elements and drop empty children before rendering.
 */
function resolve(n: unknown): unknown {
  if (Array.isArray(n)) return n.map(resolve).filter((c) => c !== null && c !== undefined && c !== false && c !== true && c !== "");
  if (n && typeof n === "object" && "type" in n && "props" in n) {
    const el = n as El;
    if (typeof el.type === "function") return resolve((el.type as (p: unknown) => unknown)(el.props));
    const { children, ...rest } = el.props ?? {};
    const kids = children === undefined ? undefined : resolve(children);
    const flat = Array.isArray(kids) ? (kids.length === 0 ? undefined : kids.length === 1 ? kids[0] : kids) : kids;
    return { ...el, props: flat === undefined ? rest : { ...rest, children: flat } };
  }
  return n === false || n === true ? null : n;
}

export function story(node: ReactNode) {
  return new ImageResponse(resolve(node) as React.ReactElement, { ...STORY, headers: { "cache-control": "no-store" } });
}
