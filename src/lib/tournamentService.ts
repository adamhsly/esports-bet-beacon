
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
    console.log('Starting tournament fetch process...');

    // Fetch PandaScore tournaments
    console.log('Fetching PandaScore tournaments...');
    const { data: pandascoreTournaments, error: pandascoreError } = await supabase
      .from('pandascore_tournaments')
      .select('*')
      .order('start_date', { ascending: false });

    if (pandascoreError) {
      console.error('Error fetching PandaScore tournaments:', pandascoreError);
      throw pandascoreError;
    }

    console.log(`Found ${pandascoreTournaments?.length || 0} PandaScore tournaments`);

    if (pandascoreTournaments) {
      const processedPandaScore = pandascoreTournaments
        .filter(t => {
          if (!t.name || !t.tournament_id) {
            console.warn('Skipping invalid PandaScore tournament:', t);
            return false;
          }
          return true;
        })
        .map(t => {
          const rawData = t.raw_data as any;
          console.log(`Processing PandaScore tournament: ${t.name}, status: ${t.status}, ID: ${t.tournament_id}`);
          
          return {
            id: `pandascore_${t.tournament_id}`,
            name: t.name,
            type: 'tournament' as const,
            source: 'pandascore' as const,
            esportType: t.esport_type,
            status: determineStatusFromPandaScore(t.start_date, t.end_date, t.status),
            startDate: t.start_date,
            endDate: t.end_date,
            prizePool: rawData?.prizepool || rawData?.tournament?.prizepool,
            tier: rawData?.tier || rawData?.tournament?.tier,
            imageUrl: t.image_url,
            rawData: t.raw_data
          };
        });

      tournaments.push(...processedPandaScore);
      console.log(`Added ${processedPandaScore.length} PandaScore tournaments`);
    }

    // Fetch SportDevs tournaments
    console.log('Fetching SportDevs tournaments...');
    const { data: sportdevsTournaments, error: sportdevsError } = await supabase
      .from('sportdevs_tournaments')
      .select('*')
      .order('start_date', { ascending: false });

    if (sportdevsError) {
      console.error('Error fetching SportDevs tournaments:', sportdevsError);
      throw sportdevsError;
    }

    console.log(`Found ${sportdevsTournaments?.length || 0} SportDevs tournaments`);

    if (sportdevsTournaments) {
      const processedSportDevs = sportdevsTournaments
        .filter(t => {
          if (!t.name || !t.tournament_id) {
            console.warn('Skipping invalid SportDevs tournament:', t);
            return false;
          }
          return true;
        })
        .map(t => ({
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
        }));

      tournaments.push(...processedSportDevs);
      console.log(`Added ${processedSportDevs.length} SportDevs tournaments`);
    }

    // Fetch unique FACEIT competitions
    console.log('Fetching FACEIT competitions...');
    const { data: faceitCompetitions, error: faceitError } = await supabase
      .from('faceit_matches')
      .select('competition_name, competition_type, region, game')
      .not('competition_name', 'is', null)
      .neq('competition_name', 'Matchmaking');

    if (faceitError) {
      console.error('Error fetching FACEIT competitions:', faceitError);
      throw faceitError;
    }

    console.log(`Found ${faceitCompetitions?.length || 0} FACEIT matches`);

    if (faceitCompetitions) {
      const uniqueCompetitions = faceitCompetitions.reduce((acc: any[], match) => {
        const existing = acc.find(c => c.competition_name === match.competition_name);
        if (!existing && match.competition_name) {
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
      console.log(`Added ${uniqueCompetitions.length} unique FACEIT competitions`);
    }

    console.log(`Total tournaments found: ${tournaments.length}`);

  } catch (error) {
    console.error('Error fetching tournaments:', error);
    throw error; // Re-throw to ensure errors are visible
  }

  return tournaments.sort((a, b) => {
    if (a.startDate && b.startDate) {
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    }
    return a.name.localeCompare(b.name);
  });
}

export async function fetchTournamentById(tournamentId: string): Promise<UnifiedTournament | null> {
  console.log(`Fetching tournament by ID: ${tournamentId}`);
  const [source, id] = tournamentId.split('_', 2);

  try {
    switch (source) {
      case 'pandascore':
        console.log(`Looking for PandaScore tournament with ID: ${id}`);
        const { data: pandaData, error: pandaError } = await supabase
          .from('pandascore_tournaments')
          .select('*')
          .eq('tournament_id', id)
          .maybeSingle();

        if (pandaError) {
          console.error('Error fetching PandaScore tournament:', pandaError);
          throw pandaError;
        }

        if (!pandaData) {
          console.warn(`PandaScore tournament with ID ${id} not found`);
          return null;
        }

        const rawData = pandaData.raw_data as any;
        return {
          id: tournamentId,
          name: pandaData.name,
          type: 'tournament',
          source: 'pandascore',
          esportType: pandaData.esport_type,
          status: determineStatusFromPandaScore(pandaData.start_date, pandaData.end_date, pandaData.status),
          startDate: pandaData.start_date,
          endDate: pandaData.end_date,
          prizePool: rawData?.prizepool || rawData?.tournament?.prizepool,
          tier: rawData?.tier || rawData?.tournament?.tier,
          imageUrl: pandaData.image_url,
          description: rawData?.description || rawData?.tournament?.description,
          rawData: pandaData.raw_data
        };

      case 'sportdevs':
        console.log(`Looking for SportDevs tournament with ID: ${id}`);
        const { data: sportData, error: sportError } = await supabase
          .from('sportdevs_tournaments')
          .select('*')
          .eq('tournament_id', id)
          .maybeSingle();

        if (sportError) {
          console.error('Error fetching SportDevs tournament:', sportError);
          throw sportError;
        }

        if (!sportData) {
          console.warn(`SportDevs tournament with ID ${id} not found`);
          return null;
        }

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

      case 'faceit':
        console.log(`Looking for FACEIT competition with ID: ${id}`);
        // For FACEIT, we need to reconstruct from the original competition name
        const competitionName = id.replace(/_/g, ' ');
        const { data: faceitData, error: faceitError } = await supabase
          .from('faceit_matches')
          .select('*')
          .eq('competition_name', competitionName)
          .limit(1)
          .maybeSingle();

        if (faceitError) {
          console.error('Error fetching FACEIT competition:', faceitError);
          throw faceitError;
        }

        if (!faceitData) {
          console.warn(`FACEIT competition with name "${competitionName}" not found`);
          return null;
        }

        return {
          id: tournamentId,
          name: faceitData.competition_name,
          type: faceitData.competition_type?.toLowerCase().includes('league') ? 'league' : 'tournament',
          source: 'faceit',
          esportType: faceitData.game || 'cs2',
          status: 'active',
          rawData: faceitData
        };

      default:
        console.warn(`Unknown tournament source: ${source}`);
        return null;
    }
  } catch (error) {
    console.error('Error fetching tournament by ID:', error);
    throw error;
  }
}

function determineStatusFromPandaScore(startDate?: string, endDate?: string, apiStatus?: string): 'upcoming' | 'active' | 'finished' {
  const now = new Date();
  
  console.log(`Determining status for tournament - startDate: ${startDate}, endDate: ${endDate}, apiStatus: ${apiStatus}`);
  
  // Handle PandaScore-specific status codes
  switch (apiStatus) {
    case 'd': // done/finished
    case 'f': // finished
    case 'c': // cancelled
      console.log('Status determined as finished based on API status');
      return 'finished';
    case 'b': // began/active
    case 'r': // running
      console.log('Status determined as active based on API status');
      return 'active';
    case 's': // scheduled/upcoming
    case 'n': // not started
      console.log('Status determined as upcoming based on API status');
      return 'upcoming';
  }
  
  // Fallback to date-based logic
  if (endDate && new Date(endDate) < now) {
    console.log('Status determined as finished based on end date');
    return 'finished';
  }
  
  if (startDate && new Date(startDate) > now) {
    console.log('Status determined as upcoming based on start date');
    return 'upcoming';
  }
  
  console.log('Status determined as active (fallback)');
  return 'active';
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
