

## Fix 1danne1's Star Team Record

### Summary
Patch the missing star team swap history for user **1danne1** and trigger a score recalculation to correctly apply the 2x multiplier.

### Data Fix

Update the `fantasy_round_star_teams` record with the following values:

| Field | Current Value | New Value |
|-------|---------------|-----------|
| `previous_star_team_id` | `null` | `133868` (Team Falcons) |
| `star_changed_at` | `null` | `2026-02-04 18:54:10` |
| `change_used` | `false` | `true` |

**SQL to execute:**
```sql
UPDATE fantasy_round_star_teams
SET 
  previous_star_team_id = '133868',
  star_changed_at = '2026-02-04 18:54:10',
  change_used = true
WHERE round_id = 'fd1c8cc4-ad0b-4503-864d-771996d8dbb3'
  AND user_id = (SELECT id FROM profiles WHERE username = '1danne1');
```

### Score Recalculation

After the data fix, the scoring logic will correctly:
- Apply **2x points** to Team Falcons (133868) for matches **before** 18:54:10 UTC on Feb 4
- Apply **2x points** to Tundra Esports (128439) for matches **after** 18:54:10 UTC on Feb 4

The next scheduled score recalculation (or a manual trigger) will update 1danne1's leaderboard position.

### Expected Outcome
1danne1's fantasy score will be recalculated with the correct star team multipliers based on the actual swap timing.

