import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { honorsFor, weekFromKey, weekStart } from "@/lib/honors";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") === "wpotw" ? "wpotw" : "potw";
  const key = url.searchParams.get("week");
  const start = key && /^\d{4}-\d{2}-\d{2}$/.test(key) ? weekFromKey(key) : weekStart();
  const h = await honorsFor(start);
  const line = kind === "potw" ? h.potw : h.wpotw;
  if (!line) return new Response("No winner for that week yet", { status: 404 });

  const gold = kind === "potw";
  const accent = gold ? "#DDB168" : "#FF453A";

  let avatar: string | null = null;
  if (line.playerId) {
    const [r] = (await db()`SELECT avatar_b64, avatar_type FROM players WHERE id = ${line.playerId}`) as {
      avatar_b64: string | null;
      avatar_type: string | null;
    }[];
    // Satori can't decode WebP reliably; only embed JPEG/PNG avatars.
    if (r?.avatar_b64 && r.avatar_type && r.avatar_type !== "image/webp") avatar = `data:${r.avatar_type};base64,${r.avatar_b64}`;
  }
  const crestRes = await fetch(new URL("/brand/crest.png", req.url));
  const crest = crestRes.ok ? `data:image/png;base64,${Buffer.from(await crestRes.arrayBuffer()).toString("base64")}` : null;

  const stat = (label: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 220 }}>
      <div style={{ fontSize: 76, fontWeight: 700, color: "#F5F5F7" }}>{value}</div>
      <div style={{ fontSize: 26, color: "#86868B", marginTop: 4 }}>{label}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: `radial-gradient(80% 55% at 50% 0%, ${gold ? "rgba(221,177,104,0.35)" : "rgba(255,69,58,0.32)"}, #000 70%)`,
          color: "#F5F5F7",
          padding: "70px 60px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {crest && <img src={crest} width={90} height={90} alt="" />}
          <div style={{ fontSize: 34, letterSpacing: 8, fontWeight: 700 }}>REVORFEST</div>
        </div>
        <div style={{ marginTop: 50, fontSize: 40, letterSpacing: 6, fontWeight: 700, color: accent }}>
          {gold ? "PLAYER OF THE WEEK" : "PLAYER OF THE WEAK"}
        </div>
        <div style={{ marginTop: 10, fontSize: 30, color: "#86868B" }}>{gold ? h.label : `Stamina depleted · ${h.label}`}</div>
        <div
          style={{
            marginTop: 60,
            width: 400,
            height: 400,
            borderRadius: 400,
            border: `8px solid ${accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background: "#1C1C1F",
            fontSize: 150,
            fontWeight: 700,
          }}
        >
          {avatar ? <img src={avatar} width={400} height={400} alt="" style={{ objectFit: "cover" }} /> : line.name.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ marginTop: 50, fontSize: 120, fontWeight: 800, letterSpacing: -4 }}>{line.name}</div>
        <div style={{ fontSize: 32, color: "#86868B" }}>{line.number ? `#${line.number}` : line.gamertag}</div>
        <div style={{ display: "flex", marginTop: 60 }}>
          {stat("Avg rating", line.avgRating.toFixed(1))}
          {stat("Goals", String(line.goals))}
          {stat("Assists", String(line.assists))}
          {stat("Matches", String(line.matches))}
        </div>
        <div style={{ marginTop: "auto", fontSize: 26, color: "#86868B" }}>revorfest.vercel.app</div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
