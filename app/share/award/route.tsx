import { seasonWinners } from "@/lib/awards";
import { rangeTable } from "@/lib/honors";
import { seasonByNumber } from "@/lib/seasons";
import { C, Hero, Frame, Stat, asset, avatarData, story } from "@/lib/share";

const META = {
  pots: { eyebrow: "PLAYER OF THE SEASON", glow: "rgba(221,177,104,0.42)" },
  boot: { eyebrow: "GOLDEN BOOT", glow: "rgba(221,177,104,0.36)" },
  assist: { eyebrow: "PLAYMAKER", glow: "rgba(221,177,104,0.36)" },
} as const;

/** One season award, one player — only once the EA season has finished. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const kind = (["pots", "boot", "assist"] as const).find((k) => k === u.searchParams.get("kind"));
  const season = seasonByNumber(Number(u.searchParams.get("season")));
  if (!kind || !season) return new Response("Bad request", { status: 400 });
  // ?preview=1 renders a running season so far (internal QA only — the UI never links it)
  const preview = u.searchParams.get("preview") === "1";
  if (season.end > new Date() && !preview) return new Response("Season still running", { status: 404 });
  const w = seasonWinners(await rangeTable(season.start, season.end > new Date() ? new Date() : season.end));
  const l = w[kind];
  if (!l) return new Response("No winner", { status: 404 });
  const [crest, av] = await Promise.all([asset(req, "/brand/crest.png"), avatarData(l.playerId)]);
  const per = (v: number) => (v / Math.max(l.matches, 1)).toFixed(2);
  const hero = kind === "boot" ? { v: String(l.goals), k: "GOALS" } : kind === "assist" ? { v: String(l.assists), k: "ASSISTS" } : { v: l.avgRating.toFixed(1), k: "AVG RATING" };

  return story(
    <Frame crest={crest} eyebrow={META[kind].eyebrow} accent={C.gold} glow={META[kind].glow}>
      <div style={{ display: "flex", marginTop: 14, fontSize: 30, color: C.mute }}>{`EA FC 27 · ${season.name}`}</div>
      <Hero avatar={av} name={l.name} gamertag={l.gamertag} number={l.number} size={460} ring={C.gold} nameColor="#F7E2B0" tint="rgba(221,177,104,0.16)" />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 60 }}>
        <div style={{ display: "flex", fontSize: 200, fontWeight: 800, letterSpacing: -8, lineHeight: 1, color: C.goldHi }}>{hero.v}</div>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, color: C.gold, fontWeight: 700 }}>{hero.k}</div>
      </div>
      <div style={{ display: "flex", marginTop: "auto", marginBottom: 70 }}>
        {kind === "pots" ? (
          <div style={{ display: "flex" }}>
            <Stat label="GOALS" value={String(l.goals)} />
            <Stat label="ASSISTS" value={String(l.assists)} />
            <Stat label="MOTM" value={String(l.motm)} />
            <Stat label="MATCHES" value={String(l.matches)} />
          </div>
        ) : (
          <div style={{ display: "flex" }}>
            <Stat label="PER MATCH" value={per(kind === "boot" ? l.goals : l.assists)} width={300} />
            <Stat label="MATCHES" value={String(l.matches)} width={300} />
            <Stat label="RATING" value={l.avgRating.toFixed(1)} width={300} />
          </div>
        )}
      </div>
    </Frame>,
  );
}
