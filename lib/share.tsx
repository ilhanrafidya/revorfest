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
  try {
    const res = await fetch(new URL(path, req.url));
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function remoteImage(url: string | null) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (type.includes("webp")) return null;
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
      <div style={{ display: "flex", fontSize: 26, color: C.dim, letterSpacing: 2 }}>{"revorfest.vercel.app"}</div>
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

export function Stat({ label, value, width = 230, color = C.chalk }: { label: string; value: string; width?: number; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width }}>
      <div style={{ display: "flex", fontSize: 84, fontWeight: 800, letterSpacing: -2, color }}>{value}</div>
      <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: C.mute, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export function story(node: ReactNode) {
  return new ImageResponse(node as React.ReactElement, { ...STORY, headers: { "cache-control": "no-store" } });
}
