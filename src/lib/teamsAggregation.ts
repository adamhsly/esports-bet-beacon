import { supabase } from '@/integrations/supabase/client';

export interface AggregatedTeam {
  id: string;
  name: string;
  image_url: string | null;
  hash_image?: string | null;
  acronym?: string;
  source: 'pandascore' | 'faceit';
  recent_matches_count: number;
  esport_type?: string;
  country?: string;
  rank?: number;
  winRate?: number;
}

// Fetch teams from Pandascore matches (last 30 days)
export async function fetchPandascoreTeams(): Promise<AggregatedTeam[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: matches, error } = await supabase
    .from('pandascore_matches')
    .select('teams, esport_type, start_time')
    .gte('start_time', thirtyDaysAgo.toISOString())
    .not('teams', 'is', null);

  if (error) {
    console.error('Error fetching Pandascore matches:', error);
    return [];
  }

  const teamMap = new Map<string, AggregatedTeam>();

  matches?.forEach((match) => {
    if (!match.teams || !Array.isArray(match.teams)) return;

    match.teams.forEach((teamData: any) => {
      const opponent = teamData?.opponent;
      if (!opponent?.id || !opponent?.name) return;

      const teamId = `pandascore_${opponent.id}`;
      
      if (teamMap.has(teamId)) {
        const existing = teamMap.get(teamId)!;
        existing.recent_matches_count++;
      } else {
        teamMap.set(teamId, {
          id: teamId,
          name: opponent.name,
          image_url: opponent.image_url || null,
          acronym: opponent.acronym || undefined,
          source: 'pandascore',
          recent_matches_count: 1,
          esport_type: match.esport_type,
          rank: Math.floor(Math.random() * 50) + 1, // Mock ranking
          winRate: Math.floor(Math.random() * 40) + 50, // Mock win rate
        });
      }
    });
  });

  return Array.from(teamMap.values());
}

// Fetch teams from Faceit matches (last 30 days)
export async function fetchFaceitTeams(): Promise<AggregatedTeam[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: matches, error } = await supabase
    .from('faceit_matches')
    .select('teams, game, started_at')
    .gte('started_at', thirtyDaysAgo.toISOString())
    .not('teams', 'is', null);

  if (error) {
    console.error('Error fetching Faceit matches:', error);
    return [];
  }

  const teamMap = new Map<string, AggregatedTeam>();

  matches?.forEach((match) => {
    if (!match.teams) return;

    // Handle Faceit team structure (faction1, faction2)
    ['faction1', 'faction2'].forEach((factionKey) => {
      const faction = match.teams[factionKey];
      if (!faction?.name) return;

      const teamId = `faceit_${faction.name.toLowerCase().replace(/\s+/g, '_')}`;
      
      if (teamMap.has(teamId)) {
        const existing = teamMap.get(teamId)!;
        existing.recent_matches_count++;
      } else {
        teamMap.set(teamId, {
          id: teamId,
          name: faction.name,
          image_url: faction.avatar || null,
          source: 'faceit',
          recent_matches_count: 1,
          esport_type: match.game,
          rank: Math.floor(Math.random() * 50) + 1, // Mock ranking
          winRate: Math.floor(Math.random() * 40) + 50, // Mock win rate
        });
      }
    });
  });

  return Array.from(teamMap.values());
}

// Aggregate teams from both sources
export async function aggregateTeams(esportFilter?: string): Promise<AggregatedTeam[]> {
  try {
    const [pandascoreTeams, faceitTeams] = await Promise.all([
      fetchPandascoreTeams(),
      fetchFaceitTeams()
    ]);

    let allTeams = [...pandascoreTeams, ...faceitTeams];

    // Filter by esport if specified
    if (esportFilter && esportFilter !== 'all') {
      allTeams = allTeams.filter(team => {
        if (!team.esport_type) return false;
        
        // Map common esport names
        const normalizedEsport = team.esport_type.toLowerCase();
        const filterEsport = esportFilter.toLowerCase();
        
        return normalizedEsport.includes(filterEsport) || 
               filterEsport.includes(normalizedEsport) ||
               (filterEsport === 'csgo' && (normalizedEsport === 'cs2' || normalizedEsport === 'counter-strike')) ||
               (filterEsport === 'cs2' && (normalizedEsport === 'csgo' || normalizedEsport === 'counter-strike'));
      });
    }

    // Sort by recent match count (descending) then by name
    allTeams.sort((a, b) => {
      if (b.recent_matches_count !== a.recent_matches_count) {
        return b.recent_matches_count - a.recent_matches_count;
      }
      return a.name.localeCompare(b.name);
    });

    return allTeams;
  } catch (error) {
    console.error('Error aggregating teams:', error);
    return [];
  }
}

// Generate sample teams as fallback
export function generateSampleTeams(): AggregatedTeam[] {
  return [
    {
      id: 'sample_1',
      name: 'Natus Vincere',
      image_url: null,
      acronym: 'NAVI',
      source: 'pandascore',
      recent_matches_count: 15,
      esport_type: 'cs2',
      country: 'Ukraine',
      rank: 1,
      winRate: 78
    },
    {
      id: 'sample_2',
      name: 'Team Liquid',
      image_url: null,
      acronym: 'TL',
      source: 'pandascore',
      recent_matches_count: 12,
      esport_type: 'cs2',
      country: 'United States',
      rank: 2,
      winRate: 75
    },
    {
      id: 'sample_3',
      name: 'Fnatic',
      image_url: null,
      acronym: 'FNC',
      source: 'faceit',
      recent_matches_count: 8,
      esport_type: 'cs2',
      country: 'United Kingdom',
      rank: 3,
      winRate: 72
    },
    {
      id: 'sample_4',
      name: 'G2 Esports',
      image_url: null,
      acronym: 'G2',
      source: 'pandascore',
      recent_matches_count: 10,
      esport_type: 'cs2',
      country: 'Germany',
      rank: 4,
      winRate: 70
    },
    {
      id: 'sample_5',
      name: 'Vitality',
      image_url: null,
      acronym: 'VIT',
      source: 'faceit',
      recent_matches_count: 6,
      esport_type: 'cs2',
      country: 'France',
      rank: 5,
      winRate: 68
    }
  ];
}