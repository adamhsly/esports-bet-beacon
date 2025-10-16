export interface FaceitScore {
  faction1: number;
  faction2: number;
}

export interface FaceitScoreResult {
  score: FaceitScore | null;
  winner: 'faction1' | 'faction2' | null;
}

/**
 * Extracts live or finished score from FACEIT match data
 * Checks multiple data sources in priority order:
 * 1. live_team_scores (for live matches)
 * 2. faceit_data.results (primary finished score)
 * 3. raw_data.results (fallback finished score)
 */
export function getFaceitScore(
  rawData: any,
  faceitData: any,
  liveScores?: any
): FaceitScoreResult {
  // Check live scores first (for ongoing matches)
  if (liveScores) {
    const faction1Score = liveScores.faction1 ?? liveScores.team1;
    const faction2Score = liveScores.faction2 ?? liveScores.team2;
    
    if (typeof faction1Score === 'number' && typeof faction2Score === 'number') {
      return {
        score: { faction1: faction1Score, faction2: faction2Score },
        winner: faction1Score > faction2Score ? 'faction1' : 
                faction2Score > faction1Score ? 'faction2' : null
      };
    }
  }

  // Check faceitData.results (primary source for finished matches)
  if (faceitData?.results?.score) {
    const { faction1, faction2 } = faceitData.results.score;
    if (typeof faction1 === 'number' && typeof faction2 === 'number') {
      return {
        score: { faction1, faction2 },
        winner: faceitData.results.winner || 
                (faction1 > faction2 ? 'faction1' : 
                 faction2 > faction1 ? 'faction2' : null)
      };
    }
  }

  // Check rawData.results (fallback for finished matches)
  if (rawData?.results?.score) {
    const { faction1, faction2 } = rawData.results.score;
    if (typeof faction1 === 'number' && typeof faction2 === 'number') {
      return {
        score: { faction1, faction2 },
        winner: rawData.results.winner || 
                (faction1 > faction2 ? 'faction1' : 
                 faction2 > faction1 ? 'faction2' : null)
      };
    }
  }

  return { score: null, winner: null };
}

/**
 * Formats FACEIT score for display (e.g., "2-0")
 */
export function formatFaceitScore(score: FaceitScore | null): string {
  if (!score) return '';
  return `${score.faction1}-${score.faction2}`;
}
