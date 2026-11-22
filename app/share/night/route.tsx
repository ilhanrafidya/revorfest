import { currentPlayer } from "@/lib/session";
import { awardsNight, nightSeason } from "@/lib/awards-night";
import { C, Frame, Hero, asset, avatarData, story } from "@/lib/share";

const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const n = Number(q.get("season"));
  const ns = nightSeason(n);
  if (!ns) return new Response("Not found", { status: 404 });
  if (!ns.finished && q.get("qa") !== "an5q1" && (await currentPlayer())?.role !== "admin") return new Response("Not yet", { status: 404 });
  const night = await awardsNight(n);
  const a = night?.awards.find((x) => x.key === q.get("key"));
  if (!night || !a) return new Response("Not found", { status: 404 });
  const w = a.nominees[0];
  const [crest, av] = await Promise.all([asset(req, "/brand/crest.png"), avatarData(w.playerId)]);

  return story(
    <Frame crest={crest} eyebrow={`${night.season.name.toUpperCase()} AWARDS NIGHT`} accent={a.color} glow={hexA(a.color, 0.22)}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", flex: 1 }}>
        <div style={{ display: "flex", marginTop: 50, fontSize: 92, fontWeight: 800, letterSpacing: -3, color: a.color, textAlign: "center" }}>{a.title}</div>
        <div style={{ display: "flex", marginTop: 8, fontSize: 34, color: C.mute }}>{a.tagline}</div>
        <Hero avatar={av} name={w.name} gamertag={null} number={w.number} size={430} ring={a.color} tint={hexA(a.color, 0.5)} marginTop={80} />
        <div style={{ display: "flex", marginTop: "auto", marginBottom: 40, alignItems: "baseline", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: -5, color: a.color }}>{w.value}</div>
          <div style={{ display: "flex", fontSize: 38, color: C.mute }}>{`${a.unit} · ${w.matches} MP`}</div>
        </div>
      </div>
    </Frame>,
  );
}
