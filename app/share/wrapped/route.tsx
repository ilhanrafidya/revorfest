import type { ReactNode } from "react";
import { getPlayerBySlug } from "@/lib/players";
import { currentPlayer } from "@/lib/session";
import { ARCHETYPES, buildWrapped, wrappedSeason } from "@/lib/wrapped";
import { C, Frame, Hero, Stat, asset, avatarData, story } from "@/lib/share";

const CARDS = ["summary", "nickname", "partner", "goals", "best", "victim", "club"] as const;
type Card = (typeof CARDS)[number];

function Face({ src, name, size, ring }: { src: string | null; name: string; size: number; ring: string }) {
  return (
    <div style={{ display: "flex", width: size, height: size, borderRadius: size, overflow: "hidden", alignItems: "center", justifyContent: "center", background: "#1C1C1F", border: `5px solid ${ring}`, fontSize: size / 3, fontWeight: 700 }}>
      {src ? <img src={src} width={size} height={size} alt="" style={{ objectFit: "cover" }} /> : name.slice(0, 2).toUpperCase()}
    </div>
  );
}

/** "#RRGGBB" + alpha → rgba(), which the Hero watermark gradient needs. */
const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const big = (v: string, color: string = C.chalk, size = 230) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 800, letterSpacing: -8, lineHeight: 1, color }}>{v}</div>
);
const line = (t: string, size = 40, color: string = C.mute, mt = 18) => (
  <div style={{ display: "flex", marginTop: mt, fontSize: size, color, textAlign: "center" }}>{t}</div>
);

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const n = Number(q.get("season"));
  const card = (CARDS as readonly string[]).includes(q.get("card") ?? "") ? (q.get("card") as Card) : "summary";
  const ws = wrappedSeason(n);
  const p = await getPlayerBySlug(q.get("slug") ?? "");
  if (!ws || !p) return new Response("Not found", { status: 404 });
  if (!ws.finished && q.get("qa") !== "pz41m" && (await currentPlayer())?.role !== "admin") return new Response("Not yet", { status: 404 });
  const w = await buildWrapped(n, p.ea_gamertag);
  if (!w) return new Response("No matches", { status: 404 });

  const arch = ARCHETYPES[w.archetype];
  const [crest, me, mate, ...tops] = await Promise.all([
    asset(req, "/brand/crest.png"),
    avatarData(w.player.playerId),
    avatarData(w.partner?.playerId ?? null),
    ...w.club.top.map((t) => avatarData(t.playerId)),
  ]);
  const eyebrow = `${w.season.name.toUpperCase()} WRAPPED`;
  const frame = (children: ReactNode, accent: string = C.volt, glow = "rgba(215,255,58,0.18)") => (
    <Frame crest={crest} eyebrow={eyebrow} accent={accent} glow={glow}>
      {children}
    </Frame>
  );

  switch (card) {
    case "nickname":
      return story(
        frame(
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", flex: 1 }}>
            <Hero avatar={me} name={w.player.name} gamertag={w.player.gamertag} number={w.player.number} size={400} ring={arch.color} tint={hexA(arch.color, 0.5)} marginTop={80} />
            {line("THIS SEASON I WAS", 30, C.mute, 60)}
            <div style={{ display: "flex", marginTop: 12, fontSize: 120, fontWeight: 800, letterSpacing: -4, color: arch.color }}>{arch.title}</div>
            {line(arch.blurb, 36, C.chalk, 16)}
            <div style={{ display: "flex", marginTop: "auto", marginBottom: 50 }}>
              {w.archetypeStats.map((s) => (
                <Stat key={s.label} label={s.label.toUpperCase()} value={s.value} width={300} />
              ))}
            </div>
          </div>,
          arch.color,
          hexA(arch.color, 0.2),
        ),
      );
    case "partner":
      if (!w.partner) return new Response("No partner", { status: 404 });
      return story(
        frame(
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", flex: 1 }}>
            {line("PARTNER IN CRIME", 34, C.chalk, 90)}
            <div style={{ display: "flex", marginTop: 70, alignItems: "center" }}>
              <Face src={me} name={w.player.name} size={360} ring={C.volt} />
              <div style={{ display: "flex", marginLeft: -60 }}>
                <Face src={mate} name={w.partner.name} size={360} ring="#8AB4FF" />
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 50, fontSize: 76, fontWeight: 800 }}>{`${w.player.name.slice(0, 12)} + ${w.partner.name.slice(0, 12)}`}</div>
            {line(`${w.partner.together} matches side by side`, 36, C.mute, 18)}
            <div style={{ display: "flex", marginTop: 70, gap: 30 }}>
              {[
                { k: "GOALS", v: String(w.partner.goals), c: C.volt },
                { k: "ASSISTS", v: String(w.partner.assists), c: "#8AB4FF" },
                { k: "WIN RATE", v: `${Math.round(w.partner.rate * 100)}%`, c: C.chalk },
              ].map((x) => (
                <div key={x.k} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 280, borderRadius: 36, padding: "34px 0", background: "rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", fontSize: 110, fontWeight: 800, letterSpacing: -4, color: x.c }}>{x.v}</div>
                  <div style={{ display: "flex", fontSize: 24, letterSpacing: 5, color: C.mute, marginTop: 4 }}>{x.k}</div>
                </div>
              ))}
            </div>
            {line("Combined, in the matches we played together", 30, C.mute, 40)}
          </div>,
        ),
      );
    case "goals":
      return story(
        frame(
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", flex: 1 }}>
            <Hero avatar={me} name={w.player.name} gamertag={w.player.gamertag} number={w.player.number} size={340} ring={C.volt} tint="rgba(215,255,58,0.38)" marginTop={70} />
            <div style={{ display: "flex", marginTop: 70, alignItems: "flex-end", gap: 70 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {big(String(w.goals), C.volt)}
                {line("GOALS", 30, C.mute, 6)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {big(String(w.assists))}
                {line("ASSISTS", 30, C.mute, 6)}
              </div>
            </div>
            {line(`${((w.goals + w.assists) / w.matches).toFixed(1)} goal involvements per match`, 38, C.chalk, 60)}
            {line(`#${w.rank.goals} in goals · #${w.rank.assists} in assists · ${w.matches} MP`, 34)}
          </div>,
        ),
      );
    case "best":
      if (!w.best) return new Response("No best match", { status: 404 });
      return story(
        frame(
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", flex: 1 }}>
            {line("MY BEST NIGHT", 34, C.chalk, 90)}
            <div style={{ display: "flex", marginTop: 40 }}>{big(w.best.rating.toFixed(1), C.gold, 300)}</div>
            {line("MATCH RATING", 30, C.mute, 6)}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 80, width: 900, borderRadius: 48, padding: "50px 40px", background: "rgba(255,255,255,0.06)" }}>
              {line("vs", 32, C.mute, 0)}
              <div style={{ display: "flex", marginTop: 6, fontSize: 64, fontWeight: 800 }}>{w.best.opponent.slice(0, 22)}</div>
              <div style={{ display: "flex", marginTop: 20, fontSize: 130, fontWeight: 800 }}>{`${w.best.gf}–${w.best.ga}`}</div>
              {line(`${w.best.goals} goals · ${w.best.assists} assists`, 40, C.chalk, 10)}
            </div>
            <div style={{ display: "flex", marginTop: 70, alignItems: "center", gap: 24 }}>
              <Face src={me} name={w.player.name} size={110} ring={C.gold} />
              <div style={{ display: "flex", fontSize: 50, fontWeight: 800 }}>{w.player.name}</div>
            </div>
          </div>,
          C.gold,
          "rgba(221,177,104,0.2)",
        ),
      );
    case "victim":
      if (!w.victim) return new Response("No victim", { status: 404 });
      return story(
        frame(
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", flex: 1 }}>
            {line("MY FAVOURITE VICTIM", 34, C.chalk, 110)}
            <div style={{ display: "flex", marginTop: 60, fontSize: 110, fontWeight: 800, letterSpacing: -3, color: C.red, textAlign: "center", lineHeight: 1.05, maxWidth: 940 }}>
              {w.victim.opponent.slice(0, 24)}
            </div>
            {w.victim.goals > 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 80 }}>
                {big(String(w.victim.goals), C.chalk, 220)}
                {line("GOALS AGAINST THEM", 30, C.mute, 6)}
              </div>
            )}
            <div style={{ display: "flex", marginTop: 70 }}>
              <Stat label="W" value={String(w.victim.W)} color={C.volt} />
              <Stat label="D" value={String(w.victim.D)} />
              <Stat label="L" value={String(w.victim.L)} color={C.red} />
            </div>
            <div style={{ display: "flex", marginTop: "auto", marginBottom: 50, alignItems: "center", gap: 24 }}>
              <Face src={me} name={w.player.name} size={110} ring={C.red} />
              <div style={{ display: "flex", fontSize: 50, fontWeight: 800 }}>{w.player.name}</div>
            </div>
          </div>,
          C.red,
          "rgba(255,69,58,0.18)",
        ),
      );
    case "club":
      return story(
        frame(
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", flex: 1 }}>
            {line(`REVORFEST'S ${w.season.name.toUpperCase()}`, 34, C.chalk, 80)}
            <div style={{ display: "flex", marginTop: 50 }}>
              <Stat label="WINS" value={String(w.club.record.W)} color={C.volt} />
              <Stat label="DRAWS" value={String(w.club.record.D)} />
              <Stat label="LOSSES" value={String(w.club.record.L)} color={C.red} />
              <Stat label="GOALS" value={`${w.club.gf}:${w.club.ga}`} />
            </div>
            {line(`${w.club.matches} matches played`, 34)}
            <div style={{ display: "flex", flexDirection: "column", width: 920, marginTop: 70 }}>
              {w.club.top.map((t, k) => (
                <div key={t.name} style={{ display: "flex", alignItems: "center", marginBottom: 24, borderRadius: 40, padding: "26px 34px", background: k === 0 ? "rgba(221,177,104,0.14)" : "rgba(255,255,255,0.05)", border: k === 0 ? "2px solid rgba(221,177,104,0.45)" : "2px solid transparent" }}>
                  <div style={{ display: "flex", width: 60, fontSize: 48, fontWeight: 800, color: k === 0 ? C.gold : C.mute }}>{String(k + 1)}</div>
                  <Face src={tops[k] ?? null} name={t.name} size={110} ring={k === 0 ? C.gold : "rgba(255,255,255,0.15)"} />
                  <div style={{ display: "flex", flexDirection: "column", marginLeft: 28, flex: 1 }}>
                    <div style={{ display: "flex", fontSize: 50, fontWeight: 800 }}>{t.name.slice(0, 16)}</div>
                    <div style={{ display: "flex", fontSize: 28, color: C.mute }}>{`${t.matches} MP`}</div>
                  </div>
                  <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: k === 0 ? C.gold : C.chalk }}>{t.rating.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>,
        ),
      );
    default:
      return story(
        frame(
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", flex: 1 }}>
            <Hero avatar={me} name={w.player.name} gamertag={w.player.gamertag} number={w.player.number} size={320} ring={arch.color} tint={hexA(arch.color, 0.45)} marginTop={60} nameSize={110} />
            <div style={{ display: "flex", marginTop: 26, fontSize: 52, fontWeight: 800, color: arch.color }}>{arch.title}</div>
            <div style={{ display: "flex", flexWrap: "wrap", width: 920, marginTop: 50, justifyContent: "space-between" }}>
              {[
                ["MATCHES", String(w.matches)],
                ["GOALS", String(w.goals)],
                ["ASSISTS", String(w.assists)],
                ["RATING", w.avgRating.toFixed(1)],
                ["MOTM", String(w.motm)],
                ["POTW", String(w.awards.potw)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 290, marginBottom: 30, borderRadius: 32, padding: "26px 0", background: "rgba(255,255,255,0.05)" }}>
                  <div style={{ display: "flex", fontSize: 76, fontWeight: 800 }}>{v}</div>
                  <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: C.mute }}>{k}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", width: 920, marginTop: 10, borderRadius: 32, padding: "26px 34px", background: "rgba(255,255,255,0.05)" }}>
              {w.best && line(`Best night: ${w.best.rating.toFixed(1)} vs ${w.best.opponent.slice(0, 20)}`, 32, C.chalk, 0)}
              {w.partner && line(`Partner in crime: ${w.partner.name}`, 32, C.chalk, 10)}
              {w.victim && line(`Favourite victim: ${w.victim.opponent.slice(0, 22)}`, 32, C.chalk, 10)}
            </div>
          </div>,
          arch.color,
          hexA(arch.color, 0.2),
        ),
      );
  }
}
