# Add full diagnostic logging to trivia-generate-board

## What we know

- Calling the function returns `500: "Could not generate a board (no_top_tier_coverage) and no fallback exists"`.
- That error fires when `topTeams.length < 4` AND the fallback table has no published boards.
- Direct SQL shows `trivia_get_top_tier_teams('Counter-Strike', 3)` returns **307 rows** — so the RPC works fine from psql.
- Therefore, when the edge function calls it via `supabase.rpc(...)`, something is returning `<4` rows (RLS, error swallowed into empty array, wrong arg, etc.) — but we can't see why because the function logs nothing between `boot` and the final error response.
- The UI swallows server detail — `toast.error(e?.message ?? "Could not start a game")` only shows the supabase-js error message, not the JSON body.

## Goal

Make every decision point in `trivia-generate-board` log a structured, greppable line, then re-run and read the logs to pinpoint the actual cause.

## Changes

### 1. `supabase/functions/trivia-generate-board/index.ts` — add logging

Add a request-scoped logger and instrument:

- **Boot of request:** log `{ requestId, esport, templateId, userId }`.
- **Top-tier RPCs:** log row counts AND `error` field returned by `supabase.rpc` (currently the code reads `.data ?? []` and silently discards `.error` — that's likely the smoking gun).
- **Approved clue pool:** log raw count, post-recognition-filter count.
- **Players query:** log count, error.
- **Per-batch player history RPC:** log batch index, slice size, returned row count, error.
- **Recognizable players:** log count.
- **Derived clues:** log counts of teams/tournaments/leagues/nations.
- **Filter pass:** log `filteredClues` count, `checkable` count.
- **Candidate generation:** log layout attempts, total candidates produced, time elapsed.
- **Scoring:** log best quality score and threshold.
- **Fallback path:** log `top_boards` count returned.
- **Every early-return/`fallbackBoard` call:** include the `reason` plus a summary snapshot of the counts so we can see the full state in one log line.
- **Top-level catch:** keep existing behavior but also include `requestId`.

Also: change `fallbackBoard` so its 500 response includes the snapshot (counts of teams/tournaments/players/etc.) so even without log access we can see the reason.

### 2. `src/lib/trivia.ts` — surface the server error body

`supabase.functions.invoke` puts the response body in `error.context.body` (a Response) when the function returns non-2xx. Read it and re-throw a richer error so the toast shows what actually happened.

```text
catch the FunctionsHttpError, await error.context.json(),
throw new Error(`generateBoard failed: ${body.error}`)
```

### 3. `src/pages/TriviaPage.tsx` — show full error in toast

Use `toast.error(message, { description })` to display both the headline and any extra detail returned by the function (reason, counts).

## After deploying

1. Open `/trivia`, click **Start game** for Counter-Strike.
2. I'll fetch `trivia-generate-board` logs and the toast text to see exactly which RPC is misbehaving (or which filter is killing the pool) and follow up with the targeted fix.

## Files touched

- `supabase/functions/trivia-generate-board/index.ts` (logging + richer error payload)
- `src/lib/trivia.ts` (extract function error body)
- `src/pages/TriviaPage.tsx` (richer toast)

No DB migrations, no new tables. Pure observability pass.
