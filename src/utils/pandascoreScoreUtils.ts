// Utility to compute live map scores for PandaScore matches from rawData
// It tries games[] winners first (finished maps), then falls back to results[] aggregate

export type TeamRef = Array<{ id?: string | number }>|string[]|{ a?: string|number; b?: string|number };

export interface PandaScoreResult { team_id: number|string; score: number }

export function getPandaScoreLiveScore(rawData: any, teamRef: TeamRef): { a: number; b: number } {
  try {
    if (!rawData) return { a: 0, b: 0 };

    // Resolve team ids (A/B) from different possible inputs
    let teamAId: string | number | undefined;
    let teamBId: string | number | undefined;

    if (Array.isArray(teamRef)) {
      // Array of teams (objects with id or array of ids)
      if (teamRef.length >= 2) {
        const t0: any = teamRef[0];
        const t1: any = teamRef[1];
        teamAId = typeof t0 === 'object' ? t0?.id : t0;
        teamBId = typeof t1 === 'object' ? t1?.id : t1;
      }
    } else if (typeof teamRef === 'object' && teamRef !== null) {
      teamAId = (teamRef as any).a;
      teamBId = (teamRef as any).b;
    }

    // Fallback to opponents in rawData if not provided
    const opponents = rawData?.opponents ?? [];
    if (!teamAId) teamAId = opponents?.[0]?.opponent?.id;
    if (!teamBId) teamBId = opponents?.[1]?.opponent?.id;

    let a = 0;
    let b = 0;

    // Prefer computing from finished games winners
    const games = Array.isArray(rawData?.games) ? rawData.games : [];
    if (games.length && (teamAId != null && teamBId != null)) {
      for (const g of games) {
        if (g?.status === 'finished' && g?.winner?.id != null) {
          const wid = String(g.winner.id);
          if (wid === String(teamAId)) a++;
          else if (wid === String(teamBId)) b++;
        }
      }
    }

    // Fallback to aggregate results if games produced no score yet
    if (a === 0 && b === 0 && Array.isArray(rawData?.results)) {
      const rA = (rawData.results as PandaScoreResult[]).find(r => String(r.team_id) === String(teamAId));
      const rB = (rawData.results as PandaScoreResult[]).find(r => String(r.team_id) === String(teamBId));
      a = rA?.score ?? 0;
      b = rB?.score ?? 0;
    }

    return { a, b };
  } catch (e) {
    console.warn('[pandascoreScoreUtils] Failed to compute live score', e);
    return { a: 0, b: 0 };
  }
}
