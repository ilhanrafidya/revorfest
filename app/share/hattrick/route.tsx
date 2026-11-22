import { hattricks, maestros } from "@/lib/awards";
import { db } from "@/lib/db";
import { C, Hero, Frame, asset, avatarData, story } from "@/lib/share";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const matchId = u.searchParams.get("match") ?? "";
  const tag = u.searchParams.get("tag") ?? "";
  const assist = u.searchParams.get("kind") === "assist";
  const found = assist
    ? (await maestros(tag)).find((x) => x.matchId === matchId)
    : (await hattricks(tag)).find((x) => x.matchId === matchId);
  if (!found) return new Response("Not found", { status: 404 });
  const count = "assists" in found ? found.assists : found.goals;
  const h = found;
  const [p] = (await db()`SELECT id, display_name, jersey_number FROM players WHERE lower(ea_gamertag) = lower(${tag}) AND active`) as {
    id: string;
    display_name: string;
    jersey_number: number;
  }[];
  const name = p?.display_name ?? h.gamertag;
  const [crest, av] = await Promise.all([asset(req, "/brand/crest.png"), avatarData(p?.id ?? null)]);
  const when = new Date(h.playedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
  const title = assist
    ? count >= 5
      ? "ASSIST MACHINE"
      : count === 4
        ? "GRAND MAESTRO"
        : "MAESTRO"
    : count >= 5
      ? "FIVE-STAR SHOW"
      : count === 4
        ? "POKER"
        : "HATTRICK HERO";
  const tone = assist ? "#8AB4FF" : C.volt;
  const res = h.gf > h.ga ? "W" : h.gf < h.ga ? "L" : "D";

  return story(
    <Frame crest={crest} eyebrow={title} accent={tone} glow={assist ? "rgba(138,180,255,0.28)" : "rgba(215,255,58,0.28)"}>
      <div style={{ display: "flex", marginTop: 14, fontSize: 30, color: C.mute }}>{when}</div>
      <Hero avatar={av} name={name} gamertag={h.gamertag} number={p?.jersey_number ?? null} size={440} ring={tone} tint={assist ? "rgba(138,180,255,0.4)" : "rgba(215,255,58,0.38)"} />
      <div style={{ display: "flex", alignItems: "flex-end", marginTop: 60 }}>
        <div style={{ display: "flex", fontSize: 240, fontWeight: 800, letterSpacing: -10, lineHeight: 0.9, color: tone }}>{String(count)}</div>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: 6, marginLeft: 20, marginBottom: 22 }}>{assist ? "ASSISTS" : "GOALS"}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "auto", marginBottom: 60, width: 920, borderRadius: 40, background: "rgba(255,255,255,0.06)", padding: "30px 40px" }}>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: C.mute }}>{"FULL TIME"}</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 10, fontSize: 52, fontWeight: 800 }}>
          <div style={{ display: "flex" }}>{`Revorfest ${h.gf}–${h.ga} ${h.opponent.length > 16 ? `${h.opponent.slice(0, 15)}…` : h.opponent}`}</div>
          <div style={{ display: "flex", marginLeft: 20, fontSize: 30, padding: "4px 16px", borderRadius: 30, background: res === "W" ? C.volt : res === "L" ? C.red : "rgba(255,255,255,0.25)", color: res === "L" ? "#fff" : "#000" }}>{res}</div>
        </div>
      </div>
    </Frame>,
  );
}
