import "server-only";

export const CLUB_ID = "856775";
export const PLATFORM = "common-gen5";

type Json = Record<string, unknown>;

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});

export type ParsedMatch = {
  match_id: string;
  match_type: string;
  played_at: string;
  goals_for: number;
  goals_against: number;
  result: "W" | "D" | "L";
  opponent_id: string | null;
  opponent_name: string | null;
  raw: unknown;
};

export type ParsedMatchPlayer = {
  match_id: string;
  gamertag: string;
  position: string | null;
  rating: number | null;
  goals: number;
  assists: number;
  shots: number;
  passes_made: number;
  pass_attempts: number;
  tackles_made: number;
  tackle_attempts: number;
  saves: number;
  clean_sheet: boolean;
  motm: boolean;
  red_cards: number;
};

/** Parses EA's clubs/matches response for one match type. Unknown shapes are skipped. */
export function parseMatches(list: unknown, matchType: string) {
  const matches: ParsedMatch[] = [];
  const players: ParsedMatchPlayer[] = [];
  if (!Array.isArray(list)) return { matches, players };

  for (const item of list) {
    const m = obj(item);
    const id = m.matchId != null ? String(m.matchId) : null;
    const clubs = obj(m.clubs);
    const ours = obj(clubs[CLUB_ID]);
    if (!id || !clubs[CLUB_ID]) continue;

    const oppId = Object.keys(clubs).find((k) => k !== CLUB_ID) ?? null;
    const opp = oppId ? obj(clubs[oppId]) : {};
    const gf = num(ours.goals ?? ours.score);
    const ga = num(ours.goalsAgainst ?? opp.goals ?? opp.score);
    const ts = num(m.timestamp);

    matches.push({
      match_id: id,
      match_type: matchType,
      played_at: new Date(ts > 1e12 ? ts : ts * 1000).toISOString(),
      goals_for: gf,
      goals_against: ga,
      result: gf > ga ? "W" : gf < ga ? "L" : "D",
      opponent_id: oppId,
      opponent_name: (obj(opp.details).name as string) ?? null,
      raw: item,
    });

    const roster = obj(obj(m.players)[CLUB_ID]);
    for (const value of Object.values(roster)) {
      const p = obj(value);
      const tag = typeof p.playername === "string" ? p.playername.trim() : "";
      if (!tag) continue;
      const rating = Number(p.rating);
      players.push({
        match_id: id,
        gamertag: tag,
        position: typeof p.pos === "string" ? p.pos : null,
        rating: Number.isFinite(rating) && rating > 0 ? rating : null,
        goals: num(p.goals),
        assists: num(p.assists),
        shots: num(p.shots),
        passes_made: num(p.passesmade),
        pass_attempts: num(p.passattempts),
        tackles_made: num(p.tacklesmade),
        tackle_attempts: num(p.tackleattempts),
        saves: num(p.saves),
        clean_sheet: num(p.cleansheetsany) + num(p.cleansheetsdef) + num(p.cleansheetsgk) > 0,
        motm: String(p.mom) === "1",
        red_cards: num(p.redcards),
      });
    }
  }
  return { matches, players };
}

export type ClubOverall = {
  gamesPlayed: number;
  wins: number;
  ties: number;
  losses: number;
  goals: number;
  goalsAgainst: number;
  cleanSheets: number | null;
  skillRating: number | null;
  currentDivision: number | null;
  bestDivision: number | null;
};

/** Merges overallStats + allTimeLeaderboard search into one summary. */
export function parseOverall(overall: unknown, leaderboard: unknown): ClubOverall | null {
  const o = obj(Array.isArray(overall) ? overall[0] : overall);
  const lb = obj(
    Array.isArray(leaderboard) ? leaderboard.find((x) => String(obj(x).clubId) === CLUB_ID) ?? leaderboard[0] : leaderboard,
  );
  const src = Object.keys(o).length ? o : lb;
  if (!Object.keys(src).length) return null;
  const pick = (k: string) => (src[k] ?? lb[k] ?? o[k]) as unknown;
  const maybe = (v: unknown) => (v == null || v === "" ? null : num(v));
  return {
    gamesPlayed: num(pick("gamesPlayed")),
    wins: num(pick("wins")),
    ties: num(pick("ties")),
    losses: num(pick("losses")),
    goals: num(pick("goals")),
    goalsAgainst: num(pick("goalsAgainst")),
    cleanSheets: maybe(lb.cleanSheets ?? o.cleanSheets),
    skillRating: maybe(o.skillRating ?? lb.skillRating),
    currentDivision: maybe(lb.currentDivision ?? o.currentDivision),
    bestDivision: maybe(o.bestDivision ?? lb.bestDivision),
  };
}

export type MemberStat = {
  name: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  ratingAve: number;
  motm: number;
  cleanSheets: number;
  position: string | null;
  winRate: number | null;
};

/** Parses members/stats (club career stats per member). */
export function parseMembers(data: unknown): MemberStat[] {
  const list = Array.isArray(obj(data).members) ? (obj(data).members as unknown[]) : Array.isArray(data) ? data : [];
  return list
    .map((x) => {
      const m = obj(x);
      return {
        name: String(m.name ?? m.playername ?? "").trim(),
        gamesPlayed: num(m.gamesPlayed),
        goals: num(m.goals),
        assists: num(m.assists),
        ratingAve: num(m.ratingAve),
        motm: num(m.manOfTheMatch),
        cleanSheets: num(m.cleanSheetsDef) + num(m.cleanSheetsGK),
        position: typeof m.favoritePosition === "string" ? m.favoritePosition : typeof m.proPos === "string" ? m.proPos : null,
        winRate: m.winRate != null ? num(m.winRate) : null,
      };
    })
    .filter((m) => m.name);
}
