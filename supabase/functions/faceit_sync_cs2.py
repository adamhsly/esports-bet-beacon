# ===============================================
# Faceit -> Supabase Ongoing Matches Sync
# (env-only secrets; no hardcoded keys)
# ===============================================

import os
import sys
import time
import json
import requests
from typing import Any, Dict, List, Optional

# --------- Required Secrets (env-only) ----------
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").strip()
SUPABASE_SERVICE_ROLE_KEY = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
FACEIT_API_KEY = (os.getenv("FACEIT_API_KEY") or "").strip()

missing = [name for name, val in [
    ("SUPABASE_URL", SUPABASE_URL),
    ("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY),
    ("FACEIT_API_KEY", FACEIT_API_KEY),
] if not val]

if missing:
    print("❌ Missing required environment variables:", ", ".join(missing))
    print("   Set them in your environment / GitHub Actions repo secrets.")
    sys.exit(1)

# ---------- Tunables (mirror Edge Function) ----------
HARD_TIMEOUT_MS = 350_000       # global budget
FETCH_TIMEOUT_MS = 7_000        # per HTTP request timeout
PAGE_SIZE = 100                 # Faceit API page size for championships & matches
MAX_PAGES_PER_TYPE = 500        # championship pages ceiling
MATCH_PAGES_PER_CHAMP_MAX = 500 # match pages per championship ceiling
UPSERT_BATCH_SIZE = 50          # upsert batch size
STOP_WITH_MS_LEFT = 1_500       # stop before deadline

# Skip only these statuses
EXCLUDED_STATUSES = {"cancelled", "canceled"}

# Internal status mapping (identical sets)
UPCOMING_STATUSES = {
    "scheduled","configured","pending","voting","ready",
    "created","not_started","to_be_played","open"
}
LIVE_STATUSES = {"ongoing","live","running","started"}
FINISHED_STATUSES = {"finished","completed"}

# ---------- Helpers ----------
def convert_faceit_timestamp(ts: Any) -> Optional[str]:
    if not ts:
        return None
    if isinstance(ts, str) and "T" in ts:
        return ts
    try:
        unix_sec = int(ts)
        if unix_sec <= 0:
            return None
        return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(unix_sec))
    except Exception:
        return None

def normalize_internal_status(status_raw: Any) -> str:
    s = (status_raw or "").lower()
    if s in EXCLUDED_STATUSES:
        return "cancelled"
    if s in FINISHED_STATUSES:
        return "finished"
    if s in UPCOMING_STATUSES:
        return "upcoming"
    if s in LIVE_STATUSES:
        return "ongoing"
    return s or "unknown"

def fetch_with_timeout(url: str, timeout_ms: int = FETCH_TIMEOUT_MS) -> requests.Response:
    headers = {
        "Authorization": f"Bearer {FACEIT_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    return requests.get(url, headers=headers, timeout=timeout_ms / 1000.0)

def iter_championships(game: str, deadline_ms: int, telemetry: Dict[str, Any]):
    page = 0
    offset = 0
    while page < MAX_PAGES_PER_TYPE:
        if int(time.time() * 1000) + STOP_WITH_MS_LEFT > deadline_ms:
            break
        url = (
            "https://open.faceit.com/data/v4/championships"
            f"?game={game}&type=ongoing&limit={PAGE_SIZE}&offset={offset}"
        )
        resp = fetch_with_timeout(url, FETCH_TIMEOUT_MS)
        if not resp.ok:
            txt = resp.text if hasattr(resp, "text") else ""
            print(f"Championships error for {game}/ongoing page {page}: {resp.status_code} {txt}")
            break

        try:
            data = resp.json()
        except Exception:
            data = None

        items = (data or {}).get("items", [])
        telemetry["championship_pages_fetched"] += 1
        if not items:
            break
        for c in items:
            yield c
        if len(items) < PAGE_SIZE:
            break

        page += 1
        offset += PAGE_SIZE

def iter_championship_matches(championship_id: str, deadline_ms: int, telemetry: Dict[str, Any]):
    page = 0
    offset = 0
    while page < MATCH_PAGES_PER_CHAMP_MAX:
        if int(time.time() * 1000) + STOP_WITH_MS_LEFT > deadline_ms:
            break

        url = (
            f"https://open.faceit.com/data/v4/championships/{championship_id}/matches"
            f"?limit={PAGE_SIZE}&offset={offset}"
        )
        resp = fetch_with_timeout(url, FETCH_TIMEOUT_MS)
        if not resp.ok:
            print(f"Matches error champ {championship_id} page {page}: {resp.status_code}")
            break

        try:
            data = resp.json()
        except Exception:
            data = None

        items = (data or {}).get("items", [])
        telemetry["match_pages_fetched"] += 1
        if not items:
            break
        for m in items:
            yield m
        if len(items) < PAGE_SIZE:
            break

        page += 1
        offset += PAGE_SIZE

def supabase_upsert(rows: List[Dict[str, Any]]):
    if not rows:
        return True, None
    url = f"{SUPABASE_URL}/rest/v1/faceit_matches?on_conflict=match_id"
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    try:
        r = requests.post(url, headers=headers, data=json.dumps(rows), timeout=120)
    except Exception as e:
        return False, f"request-error: {e}"
    if r.status_code in (200, 201, 204):
        return True, None
    return False, f"{r.status_code}: {r.text}"

# ---------- Main ----------
def main():
    games = ["cs2"]

    # Safe diagnostics (never print secrets)
    print(f"🔑 FACEIT_API_KEY loaded: {'yes' if FACEIT_API_KEY else 'NO'}")
    print(f"🔑 SUPABASE_SERVICE_ROLE_KEY loaded: {'yes' if SUPABASE_SERVICE_ROLE_KEY else 'NO'}")
    print(f"🔗 SUPABASE_URL: {SUPABASE_URL}")

    start_ms = int(time.time() * 1000)
    deadline_ms = start_ms + HARD_TIMEOUT_MS

    print(f"🎮 Games to sync (ONGOING; upsert while streaming; skip only cancelled): {', '.join(games)}")

    telemetry: Dict[str, Any] = {
        "championships_processed": 0,
        "championship_pages_fetched": 0,
        "match_pages_fetched": 0,
        "api_total_matches_seen": 0,
        "eligible_non_cancelled": 0,
        "upsert_attempted": 0,
        "upsert_succeeded": 0,
        "champs_with_matches": 0,
        "champs_with_zero": 0,
        "statuses_seen": set(),
        "status_counts": {},
        "unique_players_found": 0,
    }

    player_ids = set()
    match_date_bounds: Dict[str, Dict[str, Optional[int]]] = {}

    def touch_bounds(game: str, iso: Optional[str]):
        if not iso:
            return
        try:
            t = int(time.mktime(time.strptime(iso[:19], "%Y-%m-%dT%H:%M:%S"))) * 1000
        except Exception:
            return
        cur = match_date_bounds.get(game, {"min": None, "max": None})
        if cur["min"] is None or t < cur["min"]:
            cur["min"] = t
        if cur["max"] is None or t > cur["max"]:
            cur["max"] = t
        match_date_bounds[game] = cur

    try:
        for game in games:
            if int(time.time() * 1000) + STOP_WITH_MS_LEFT > deadline_ms:
                break
            print(f"📋 Paging ONGOING championships for {game.upper()}…")

            for champ in iter_championships(game, deadline_ms, telemetry):
                if int(time.time() * 1000) + STOP_WITH_MS_LEFT > deadline_ms:
                    break

                telemetry["championships_processed"] += 1

                champ_id = champ.get("championship_id")
                name = champ.get("name", "")
                total_matches_in_champ = 0
                samples_logged = 0
                batch: List[Dict[str, Any]] = []

                for m in iter_championship_matches(champ_id, deadline_ms, telemetry):
                    telemetry["api_total_matches_seen"] += 1
                    total_matches_in_champ += 1

                    status = (m.get("status") or "").lower()
                    if status:
                        telemetry["statuses_seen"].add(status)
                        telemetry["status_counts"][status] = telemetry["status_counts"].get(status, 0) + 1

                    if status in EXCLUDED_STATUSES:
                        continue  # skip cancelled

                    telemetry["eligible_non_cancelled"] += 1

                    # Optional tracking of players
                    try:
                        for p in (m.get("teams", {}).get("faction1", {}).get("roster", []) or []):
                            pid = p.get("player_id")
                            if pid:
                                player_ids.add(pid)
                        for p in (m.get("teams", {}).get("faction2", {}).get("roster", []) or []):
                            pid = p.get("player_id")
                            if pid:
                                player_ids.add(pid)
                    except Exception:
                        pass

                    started_at = convert_faceit_timestamp(m.get("started_at"))
                    scheduled_at = convert_faceit_timestamp(m.get("scheduled_at"))
                    finished_at = convert_faceit_timestamp(m.get("finished_at"))

                    row = {
                        "match_id": m.get("match_id"),
                        "game": m.get("game"),
                        "region": m.get("region"),
                        "competition_name": m.get("competition_name"),
                        "competition_type": m.get("competition_type"),
                        "organized_by": m.get("organized_by"),
                        "status": normalize_internal_status(m.get("status")),
                        "started_at": started_at,
                        "scheduled_at": scheduled_at,
                        "finished_at": finished_at,
                        "configured_at": convert_faceit_timestamp(m.get("configured_at")),
                        "calculate_elo": m.get("calculate_elo"),
                        "version": m.get("version"),
                        "teams": m.get("teams"),
                        "voting": m.get("voting"),
                        "faceit_data": {
                            "region": m.get("region"),
                            "competition_type": m.get("competition_type"),
                            "organized_by": m.get("organized_by"),
                            "calculate_elo": m.get("calculate_elo"),
                            "results": m.get("results"),
                        },
                        "raw_data": m,
                        "championship_stream_url": None,
                        "championship_raw_data": None,
                    }

                    best_iso = started_at or scheduled_at or finished_at
                    touch_bounds(game, best_iso)

                    batch.append(row)

                    if samples_logged < 2 and telemetry["match_pages_fetched"] < 5:
                        print(f"🔍 Sample match from {name} ({champ_id}):")
                        try:
                            print(json.dumps(m, indent=2))
                        except Exception:
                            print(str(m))
                        samples_logged += 1

                    if len(batch) >= UPSERT_BATCH_SIZE or int(time.time() * 1000) + STOP_WITH_MS_LEFT > deadline_ms:
                        telemetry["upsert_attempted"] += len(batch)
                        ok, err = supabase_upsert(batch)
                        if not ok:
                            print(f"❌ Batch upsert error ({len(batch)} rows): {err}")
                        else:
                            telemetry["upsert_succeeded"] += len(batch)
                        batch = []

                if batch and int(time.time() * 1000) + STOP_WITH_MS_LEFT <= deadline_ms:
                    telemetry["upsert_attempted"] += len(batch)
                    ok, err = supabase_upsert(batch)
                    if not ok:
                        print(f"❌ Final batch upsert error ({len(batch)} rows): {err}")
                    else:
                        telemetry["upsert_succeeded"] += len(batch)
                    batch = []

                if total_matches_in_champ == 0:
                    telemetry["champs_with_zero"] += 1
                    print(f"⚪ Championship {name} ({champ_id}) returned 0 matches.")
                else:
                    telemetry["champs_with_matches"] += 1
                    print(f"🏁 Championship {name} returned {total_matches_in_champ} matches.")

        # End-of-run bounds logs
        match_date_bounds_iso: Dict[str, Dict[str, Optional[str]]] = {}
        for g in games:
            b = match_date_bounds.get(g)
            oldest_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(b["min"] / 1000)) if b and b.get("min") is not None else None
            newest_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(b["max"] / 1000)) if b and b.get("max") is not None else None
            match_date_bounds_iso[g] = {"oldest": oldest_iso, "newest": newest_iso}

            print(f"📅 {g.upper()} oldest match date (this run): {oldest_iso or 'none'}")
            print(f"🕓 {g.upper()} most recent match date (this run): {newest_iso or 'none'}")

        duration_ms = int(time.time() * 1000) - start_ms
        print(f"✅ Ongoing sync (streaming upserts) completed in {duration_ms}ms")
        print(f"📊 Total matches seen: {telemetry['api_total_matches_seen']}")
        print(f"📊 Eligible (non-cancelled): {telemetry['eligible_non_cancelled']}")
        print(f"📈 Upserts attempted: {telemetry['upsert_attempted']}, succeeded: {telemetry['upsert_succeeded']}")
        print(f"📊 Status counts: {json.dumps(telemetry['status_counts'])}")
        print(f"📊 Championships with matches: {telemetry['champs_with_matches']}, with zero: {telemetry['champs_with_zero']}")

        result = {
            "success": True,
            "duration_ms": duration_ms,
            "games_processed": games,
            "mode": "ongoing_streaming_non_cancelled",
            "api_total_matches_seen": telemetry["api_total_matches_seen"],
            "eligible_non_cancelled": telemetry["eligible_non_cancelled"],
            "upsert_attempted": telemetry["upsert_attempted"],
            "upsert_succeeded": telemetry["upsert_succeeded"],
            "champs_with_matches": telemetry["champs_with_matches"],
            "champs_with_zero": telemetry["champs_with_zero"],
            "statuses_seen": list(telemetry["statuses_seen"]),
            "status_counts": telemetry["status_counts"],
            "unique_players_found": len(player_ids),
            "match_date_bounds": match_date_bounds_iso,
        }
        print(json.dumps(result, indent=2))

    except Exception as err:
        duration_ms = int(time.time() * 1000) - start_ms
        print("❌ FACEIT sync failed:", err)
        fail = {
            "success": False,
            "error": str(err),
            "duration_ms": duration_ms,
            "mode": "ongoing_streaming_non_cancelled",
        }
        print(json.dumps(fail, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
