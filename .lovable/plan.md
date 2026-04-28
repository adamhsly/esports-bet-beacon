# Pre-baked Boards: Instant Start

## Problem
Live board generation in `trivia-generate-board` keeps failing or timing out (heavy RPCs, large in-memory joins, edge worker limits). Users wait, then hit errors.

## Solution
Stop generating at request time. Instead:
1. Run a **batch job** once (and on demand) that builds N high-quality boards per esport and saves them to `trivia_grid_templates` (which already has `is_generated`, `quality_score`, `cell_min_answers`).
2. **Start Game** simply picks a random unused pre-baked board from the pool — instant, no RPC, no timeout.
3. Provide an admin button to **(re)build the pool** when clues change or the pool runs low.

## Architecture

```text
            ┌──────────────────────────────────┐
            │ trivia-bake-boards (edge fn)     │
            │  - runs in chunks                │
            │  - reuses existing generator     │
            │  - writes is_generated=true rows │
            └───────────────┬──────────────────┘
                            │
                            ▼
              public.trivia_grid_templates
              (is_generated=true, esport, quality)
                            │
                            ▼
            ┌──────────────────────────────────┐
            │ trivia-pick-board (edge fn)      │
            │  - SELECT random unused row      │
            │  - returns board instantly       │
            └──────────────────────────────────┘
```

## Changes

### 1. New edge function: `trivia-bake-boards`
- Input: `{ esport, count, minQuality? }`
- Loads top-tier teams/tournaments/players + active clues **once** at the top.
- Loops `count` times, each iteration:
  - Runs the existing assemble + score + cell-validation pipeline.
  - On success, inserts into `trivia_grid_templates` with `is_generated=true`, `name=auto-{esport}-{n}`, `quality_score`, `cell_min_answers`, `avg_cell_answers`.
  - Skips fingerprints already present (dedupe via `trivia_board_fingerprints`).
- Chunked: caller passes `count: 20` per call to avoid worker timeout. Returns `{ baked, skipped, failed }`.

### 2. New edge function: `trivia-pick-board`
Replaces live generation for the Start Game flow.
- Input: `{ esport, userId? }`
- Logic:
  ```ts
  // prefer boards the user hasn't seen recently
  SELECT id FROM trivia_grid_templates
  WHERE esport = $1 AND is_active AND is_generated
    AND id NOT IN (recent user board history)
  ORDER BY random() LIMIT 1;
  ```
- Falls back to any active generated board for that esport if user-filtered pool is empty.
- Returns the resolved board (rowClues + colClues + fingerprint) using the same shape `generateBoard` returns today.
- Logs to `trivia_user_board_history` so the same user doesn't repeat boards.

### 3. Admin UI: Bake Boards button
In `src/pages/admin/TriviaAdminPage.tsx`:
- New section "Board Pool" per esport showing count of generated boards (`SELECT count(*) … WHERE is_generated`).
- "Bake 20 more" button → calls `trivia-bake-boards` with `count: 20`. Shows progress toast.
- "Bake until 100" helper that loops the call client-side until pool ≥ 100.

### 4. Frontend swap
`src/lib/trivia.ts` → `generateBoard` now invokes `trivia-pick-board` instead of `trivia-generate-board`. Same return shape, so `TriviaPage.tsx` is unchanged.
- Keep `trivia-generate-board` deployed (used internally by the bake job, not by users).

### 5. Migration
- Add index: `CREATE INDEX IF NOT EXISTS idx_trivia_grid_templates_pool ON trivia_grid_templates (esport, is_active, is_generated);`
- Optional: a `last_served_at` column so we can prefer least-recently-served boards instead of pure random.

## One-off seeding
After deploy, you (or an admin) click "Bake until 100" once per esport. From then on, Start Game is instant. Re-bake whenever you add new clues.

## Files
- create `supabase/functions/trivia-bake-boards/index.ts` (extracted core from `trivia-generate-board`)
- create `supabase/functions/trivia-pick-board/index.ts`
- create migration: index on `trivia_grid_templates`, optional `last_served_at`
- edit `src/lib/trivia.ts` (`generateBoard` → invoke pick-board)
- edit `src/pages/admin/TriviaAdminPage.tsx` (pool stats + bake button)

Approve and I'll implement.
