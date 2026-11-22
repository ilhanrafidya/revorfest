"""Revorfest EA Pro Clubs sync.

Fetches club 856775 (platform common-gen5) from EA's Pro Clubs API using a
Chrome-like HTTP client, then posts the raw JSON to the app's /api/ingest.

Runs in GitHub Actions (every 15 min at match time) (authenticates with the job's OIDC token) or on any PC
(set INGEST_SECRET). Usage:  python scripts/ea_sync.py
"""
import json
import os
import sys
import time

try:
    from curl_cffi import requests as http

    CLIENT = {"impersonate": "chrome"}
except ImportError:  # plain fallback
    import requests as http  # type: ignore

    CLIENT = {}

BASE = "https://proclubs.ea.com/api/fc"
CLUB = os.environ.get("EA_CLUB_ID", "856775")
PLATFORM = os.environ.get("EA_PLATFORM", "common-gen5")
INGEST_URL = os.environ.get("INGEST_URL", "https://revorfest.vercel.app/api/ingest")

HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.ea.com/",
    "Origin": "https://www.ea.com",
}

ENDPOINTS = {
    "overall": f"/clubs/overallStats?platform={PLATFORM}&clubIds={CLUB}",
    "info": f"/clubs/info?platform={PLATFORM}&clubIds={CLUB}",
    "members": f"/members/stats?platform={PLATFORM}&clubId={CLUB}",
    "leaderboard": f"/allTimeLeaderboard/search?platform={PLATFORM}&clubName=Revorfest",
    "leagueMatch": f"/clubs/matches?platform={PLATFORM}&clubIds={CLUB}&matchType=leagueMatch&maxResultCount=10",
    "playoffMatch": f"/clubs/matches?platform={PLATFORM}&clubIds={CLUB}&matchType=playoffMatch&maxResultCount=10",
    "friendlyMatch": f"/clubs/matches?platform={PLATFORM}&clubIds={CLUB}&matchType=friendlyMatch&maxResultCount=10",
}


def fetch(session, path):
    last = None
    for attempt in range(3):
        try:
            r = session.get(BASE + path, headers=HEADERS, timeout=20, **CLIENT)
            if r.status_code == 200:
                return r.json(), None
            last = f"HTTP {r.status_code}: {r.text[:160]}"
        except Exception as e:  # network / JSON errors
            last = f"{type(e).__name__}: {e}"
        time.sleep(2 * (attempt + 1))
    return None, last


def auth_token():
    url = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL")
    req_token = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if url and req_token:
        r = http.get(url + "&audience=revorfest-ingest", headers={"Authorization": f"bearer {req_token}"}, timeout=20)
        r.raise_for_status()
        return r.json()["value"]
    secret = os.environ.get("INGEST_SECRET")
    if not secret:
        sys.exit("No GitHub OIDC token and no INGEST_SECRET set.")
    return secret


def main():
    session = http.Session()
    fetched, errors = {}, {}
    for key, path in ENDPOINTS.items():
        data, err = fetch(session, path)
        if err:
            errors[key] = err
            print(f"[{key}] {err}")
        else:
            fetched[key] = data
            print(f"[{key}] ok")
        time.sleep(0.8)

    # log the division-related fields EA sends (helps map Div 5…1 / Elite correctly)
    def div_fields(x):
        out = {}
        items = x if isinstance(x, list) else [x]
        for it in items[:3]:
            if isinstance(it, dict):
                for k, v in it.items():
                    if any(w in k.lower() for w in ("div", "skill", "rank", "promotion", "league", "points", "season")) and not isinstance(v, (dict, list)):
                        out[k] = v
        return out
    for key in ("overall", "leaderboard", "info"):
        if key in fetched:
            data = fetched[key]
            if key == "info" and isinstance(data, dict):
                data = list(data.values())
            print(f"[{key} division fields]", json.dumps(div_fields(data))[:800])

    # log clean-sheet related fields (one match + one member) to see what EA actually sends
    try:
        for t in ("leagueMatch", "playoffMatch", "friendlyMatch"):
            for mt in (fetched.get(t) or [])[:10]:
                clubs = mt.get("clubs", {})
                ours = clubs.get(CLUB_ID) or {}
                players = (mt.get("players") or {}).get(CLUB_ID) or {}
                if not players:
                    continue
                ga = ours.get("goalsAgainst")
                sample = {}
                for p in list(players.values())[:11]:
                    sample[p.get("playername", "?")] = {k: v for k, v in p.items() if "clean" in k.lower() or k in ("pos", "goalsconceded")}
                print(f"[clean {t} ga={ga}]", json.dumps(sample)[:900])
                break
        mem = fetched.get("members")
        mlist = mem.get("members") if isinstance(mem, dict) else mem
        if isinstance(mlist, list) and mlist:
            print("[clean members]", json.dumps({m.get("name", "?"): {k: v for k, v in m.items() if "clean" in k.lower() or "Conceded" in k} for m in mlist[:6]})[:900])
    except Exception as e:  # never break the sync over a debug line
        print("[clean debug error]", e)

    payload = {
        "source": "github-actions" if os.environ.get("GITHUB_ACTIONS") else "manual",
        "fetched": fetched,
        "errors": errors,
    }
    r = http.post(
        INGEST_URL,
        data=json.dumps(payload),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {auth_token()}"},
        timeout=60,
    )
    print("ingest:", r.status_code, r.text[:500])
    if r.status_code != 200 or not fetched:
        sys.exit(1)


if __name__ == "__main__":
    main()
