import { ImageResponse } from "next/og";
import { formationSlots } from "@/lib/formations";
import { KITS } from "@/lib/kits";
import { currentMatchday, matchdayById, matchdayRoster } from "@/lib/matchday";

async function dataUri(url: URL) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return `data:image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const md = id ? await matchdayById(id) : await currentMatchday();
  if (!md) return new Response("No matchday", { status: 404 });
  const { roster, lineup } = await matchdayRoster(md.id);
  const byId = new Map(roster.map((p) => [p.id, p]));
  const slots = formationSlots(md.formation);
  const [kit, crest] = await Promise.all([dataUri(new URL(`/kits/${md.kit}.png`, req.url)), dataUri(new URL("/brand/crest.png", req.url))]);
  const when = new Date(md.scheduled_at).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  const numColor = md.kit === "home" ? "#000" : md.kit === "away" ? "#D7FF3A" : "#fff";
  const W = 960;
  const H = 1000;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#000", color: "#F5F5F7", padding: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {crest && <img src={crest} width={80} height={80} alt="" />}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 46, fontWeight: 800 }}>Revorfest · {md.formation}</div>
            <div style={{ fontSize: 26, color: "#86868B" }}>
              {when} WIB · {KITS[md.kit].label} kit
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 40,
            width: W,
            height: H,
            position: "relative",
            display: "flex",
            borderRadius: 36,
            border: "3px solid rgba(255,255,255,0.25)",
            background: "linear-gradient(180deg, #0e4627, #0b3d22)",
          }}
        >
          <div style={{ position: "absolute", left: 0, right: 0, top: H / 2, height: 3, background: "rgba(255,255,255,0.25)", display: "flex" }} />
          <div
            style={{
              position: "absolute",
              left: W / 2 - 100,
              top: H / 2 - 100,
              width: 200,
              height: 200,
              borderRadius: 200,
              border: "3px solid rgba(255,255,255,0.25)",
              display: "flex",
            }}
          />
          {slots.map((s, i) => {
            const p = lineup[i] ? byId.get(lineup[i]!) : undefined;
            const x = (s.x / 100) * W;
            const y = H - (s.y / 100) * H;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x - 90,
                  top: y - 70,
                  width: 180,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div style={{ position: "relative", width: 100, height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {kit && <img src={kit} width={100} height={100} alt="" style={{ position: "absolute", left: 0, top: 0, objectFit: "contain" }} />}
                  <div style={{ fontSize: 34, fontWeight: 800, color: numColor, marginTop: 8, display: "flex" }}>{p ? String(p.number) : ""}</div>
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 24,
                    fontWeight: 700,
                    background: "rgba(0,0,0,0.6)",
                    padding: "4px 14px",
                    borderRadius: 20,
                    display: "flex",
                    maxWidth: 180,
                  }}
                >
                  {p ? p.name : s.label}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "auto", fontSize: 24, color: "#86868B", display: "flex" }}>revorfest.vercel.app/matchday</div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
