
import { supabase } from '@/integrations/supabase/client';

export interface UnifiedTournament {
  id: string;
  name: string;
  type: 'tournament' | 'league';
  source: 'pandascore' | 'sportdevs' | 'faceit';
  esportType: string;
  status: 'upcoming' | 'active' | 'finished';
  startDate?: string;
  endDate?: string;
  prizePool?: string | number;
  tier?: string;
  participantCount?: number;
  imageUrl?: string;
  description?: string;
  rawData?: any;
}

export interface TournamentStanding {
  position: number;
  team: {
    id: string;
    name: string;
    logo: string;
  };
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
}

export async function fetchUnifiedTournaments(): Promise<UnifiedTournament[]> {
  const tournaments: UnifiedTournament[] = [];

  try {
    // Fetch PandaScore tournaments
    const { data: pandascoreTournaments } = await supabase
      .from('pandascore_tournaments')
      .select('*')
      .order('start_date', { ascending: false });

    if (pandascoreTournaments) {
      tournaments.push(...pandascoreTournaments.map(t => {
        const rawData = t.raw_data as any;
        return {
          id: `pandascore_${t.tournament_id}`,
          name: t.name,
          type: 'tournament' as const,
          source: 'pandascore' as const,
          esportType: t.esport_type,
          status: determineStatus(t.start_date, t.end_date, t.status),
          startDate: t.start_date,
          endDate: t.end_date,
          prizePool: rawData?.prizepool || rawData?.tournament?.prizepool,
          tier: rawData?.tier || rawData?.tournament?.tier,
          imageUrl: t.image_url,
          rawData: t.raw_data
        };
      }));
    }

    // Fetch SportDevs tournaments
    const { data: sportdevsTournaments } = await supabase
      .from('sportdevs_tournaments')
      .select('*')
      .order('start_date', { ascending: false });

    if (sportdevsTournaments) {
      tournaments.push(...sportdevsTournaments.map(t => ({
        id: `sportdevs_${t.tournament_id}`,
        name: t.name,
        type: 'tournament' as const,
        source: 'sportdevs' as const,
        esportType: t.esport_type,
        status: determineStatus(t.start_date, t.end_date, t.status),
        startDate: t.start_date,
        endDate: t.end_date,
        imageUrl: t.image_url,
        rawData: t.raw_data
      })));
    }

    // Fetch unique FACEIT competitions
    const { data: faceitCompetitions } = await supabase
      .from('faceit_matches')
      .select('competition_name, competition_type, region, game')
      .not('competition_name', 'is', null)
      .neq('competition_name', 'Matchmaking');

    if (faceitCompetitions) {
      const uniqueCompetitions = faceitCompetitions.reduce((acc: any[], match) => {
        const existing = acc.find(c => c.competition_name === match.competition_name);
        if (!existing) {
          acc.push({
            id: `faceit_${match.competition_name?.replace(/\s+/g, '_').toLowerCase()}`,
            name: match.competition_name,
            type: match.competition_type?.toLowerCase().includes('league') ? 'league' : 'tournament',
            source: 'faceit',
            esportType: match.game || 'cs2',
            status: 'active',
            region: match.region
          });
        }
        return acc;
      }, []);

      tournaments.push(...uniqueCompetitions);
    }

  } catch (error) {
    console.error('Error fetching tournaments:', error);
  }

  return tournaments.sort((a, b) => {
    if (a.startDate && b.startDate) {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    }
    return a.name.localeCompare(b.name);
  });
}

export async function fetchTournamentById(tournamentId: string): Promise<UnifiedTournament | null> {
  const [source, id] = tournamentId.split('_', 2);

  try {
    switch (source) {
      case 'pandascore':
        const { data: pandaData } = await supabase
          .from('pandascore_tournaments')
          .select('*')
          .eq('tournament_id', id)
          .single();

        if (pandaData) {
          const rawData = pandaData.raw_data as any;
          return {
            id: tournamentId,
            name: pandaData.name,
            type: 'tournament',
            source: 'pandascore',
            esportType: pandaData.esport_type,
            status: determineStatus(pandaData.start_date, pandaData.end_date, pandaData.status),
            startDate: pandaData.start_date,
            endDate: pandaData.end_date,
            prizePool: rawData?.prizepool || rawData?.tournament?.prizepool,
            tier: rawData?.tier || rawData?.tournament?.tier,
            imageUrl: pandaData.image_url,
            description: rawData?.description || rawData?.tournament?.description,
            rawData: pandaData.raw_data
          };
        }
        break;

      case 'sportdevs':
        const { data: sportData } = await supabase
          .from('sportdevs_tournaments')
          .select('*')
          .eq('tournament_id', id)
          .single();

        if (sportData) {
          return {
            id: tournamentId,
            name: sportData.name,
            type: 'tournament',
            source: 'sportdevs',
            esportType: sportData.esport_type,
            status: determineStatus(sportData.start_date, sportData.end_date, sportData.status),
            startDate: sportData.start_date,
            endDate: sportData.end_date,
            imageUrl: sportData.image_url,
            rawData: sportData.raw_data
          };
        }
        break;

      case 'faceit':
        // For FACEIT, we need to reconstruct from the original competition name
        const competitionName = id.replace(/_/g, ' ');
        const { data: faceitData } = await supabase
          .from('faceit_matches')
          .select('*')
          .eq('competition_name', competitionName)
          .limit(1)
          .single();

        if (faceitData) {
          return {
            id: tournamentId,
            name: faceitData.competition_name,
            type: faceitData.competition_type?.toLowerCase().includes('league') ? 'league' : 'tournament',
            source: 'faceit',
            esportType: faceitData.game || 'cs2',
            status: 'active',
            rawData: faceitData
          };
        }
        break;
    }
  } catch (error) {
    console.error('Error fetching tournament by ID:', error);
  }

  return null;
}

function determineStatus(startDate?: string, endDate?: string, apiStatus?: string): 'upcoming' | 'active' | 'finished' {
  const now = new Date();
  
  if (endDate && new Date(endDate) < now) {
    return 'finished';
  }
  
  if (startDate && new Date(startDate) > now) {
    return 'upcoming';
  }
  
  if (apiStatus === 'finished' || apiStatus === 'completed') {
    return 'finished';
  }
  
  if (apiStatus === 'upcoming' || apiStatus === 'scheduled') {
    return 'upcoming';
  }
  
  return 'active';
}

export function formatPrizePool(prizePool: number | string): string | null {
  if (!prizePool) return null;
  
  let amount: number;
  
  if (typeof prizePool === 'string') {
    const numberMatch = prizePool.match(/\d+/);
    if (!numberMatch) return null;
    amount = parseInt(numberMatch[0]);
  } else {
    amount = prizePool;
  }
  
  if (isNaN(amount) || amount <= 0) return null;
  
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  } else {
    return `$${amount}`;
  }
}
