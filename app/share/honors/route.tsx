import { honorsFor, weekFromKey, weekStart } from "@/lib/honors";
import { C, Hero, Frame, Stat, asset, avatarData, story } from "@/lib/share";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") === "wpotw" ? "wpotw" : "potw";
  const key = url.searchParams.get("week");
  const start = key && /^\d{4}-\d{2}-\d{2}$/.test(key) ? weekFromKey(key) : weekStart();
  const h = await honorsFor(start);
  const line = kind === "potw" ? h.potw : h.wpotw;
  if (!line) return new Response("No winner for that week yet", { status: 404 });

  const gold = kind === "potw";
  const accent = gold ? C.gold : C.red;
  const [crest, avatar] = await Promise.all([asset(req, "/brand/crest.png"), avatarData(line.playerId)]);

  return story(
    <Frame crest={crest} eyebrow={gold ? "PLAYER OF THE WEEK" : "PLAYER OF THE WEAK"} accent={accent} glow={gold ? "rgba(221,177,104,0.38)" : "rgba(255,69,58,0.32)"}>
      <div style={{ display: "flex", marginTop: 14, fontSize: 30, color: C.mute }}>{gold ? h.label : `Stamina depleted · ${h.label}`}</div>
      <Hero
        avatar={avatar}
        name={line.name}
        gamertag={line.gamertag}
        number={line.number}
        size={480}
        ring={accent}
        nameSize={140}
        marginTop={110}
        tint={gold ? "rgba(221,177,104,0.13)" : "rgba(255,69,58,0.12)"}
      />
      <div style={{ display: "flex", marginTop: "auto", marginBottom: 90 }}>
        <Stat label="RATING" value={line.avgRating.toFixed(1)} color={accent} />
        <Stat label="GOALS" value={String(line.goals)} />
        <Stat label="ASSISTS" value={String(line.assists)} />
        <Stat label="MATCHES" value={String(line.matches)} />
      </div>
    </Frame>,
  );
}
