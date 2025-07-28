import { supabase } from '@/integrations/supabase/client';

// Types for the enhanced FACEIT match data
export interface EnhancedMatchData {
  matchId: string;
  status: string;
  matchPhase?: string;
  currentRound?: number;
  roundTimer?: number;
  overtimeRounds?: number;
  teams?: any; // Add teams data
  liveTeamScores?: {
    faction1: number;
    faction2: number;
  };
  mapsPlayed?: Array<{
    mapName: string;
    faction1Score: number;
    faction2Score: number;
    winnerFaction: 'faction1' | 'faction2';
    duration: number;
  }>;
  roundResults?: Array<{
    roundNumber: number;
    mapName: string;
    winningFaction: 'faction1' | 'faction2';
    roundType: string;
    roundEndReason: string;
    bombPlanted: boolean;
  }>;
  livePlayerStatus?: Record<string, {
    alive: boolean;
    health: number;
    armor: number;
    money: number;
    weapon: string;
    kills: number;
    deaths: number;
    assists: number;
  }>;
  killFeed?: Array<{
    id: string;
    killer: string;
    victim: string;
    weapon: string;
    headshot: boolean;
    timestamp: string;
  }>;
  economyData?: Record<string, any>;
  objectivesStatus?: Record<string, any>;
  autoRefreshInterval?: number;
  // Additional fields for compatibility
  faceitData?: any;
  startTime?: string;
  started_at?: string;
  finished_at?: string;
  bestOf?: number;
}

export interface PlayerMatchPerformance {
  playerId: string;
  nickname: string;
  teamFaction: 'faction1' | 'faction2';
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  kdRatio: number;
  adr: number;
  headshots: number;
  headshotPercent: number;
  mvpRounds: number;
  rating: number;
  firstKills: number;
  firstDeaths: number;
  clutchRoundsWon: number;
  clutchRoundsAttempted: number;
  damageDealt: number;
  flashAssists: number;
}

export interface LiveMatchStats {
  matchId: string;
  roundNumber: number;
  roundPhase: string;
  roundTimer: number;
  teamScores: {
    faction1: number;
    faction2: number;
  };
  playerPositions: Record<string, any>;
  playerHealth: Record<string, number>;
  playerArmor: Record<string, number>;
  playerWeapons: Record<string, string>;
  playerMoney: Record<string, number>;
  bombStatus: 'planted' | 'defused' | 'exploded' | 'none';
  bombSite?: string;
  bombTimer?: number;
}

export interface RoundResult {
  roundNumber: number;
  mapName: string;
  winningFaction: 'faction1' | 'faction2';
  roundType: 'pistol' | 'eco' | 'force' | 'full_buy' | 'anti_eco';
  roundEndReason: 'elimination' | 'bomb_defused' | 'bomb_exploded' | 'time_expired' | 'surrender';
  roundDuration: number;
  faction1ScoreBefore: number;
  faction2ScoreBefore: number;
  faction1ScoreAfter: number;
  faction2ScoreAfter: number;
  bombPlanted: boolean;
  bombDefused: boolean;
  bombExploded: boolean;
  firstKillPlayer: string;
  roundMvp: string;
}

export interface KillFeedEntry {
  matchId: string;
  roundNumber: number;
  timestamp: string;
  roundTime: number;
  killerId: string;
  killerNickname: string;
  killerTeam: 'faction1' | 'faction2';
  victimId: string;
  victimNickname: string;
  victimTeam: 'faction1' | 'faction2';
  weapon: string;
  headshot: boolean;
  wallbang: boolean;
  eventType: 'kill' | 'assist' | 'suicide' | 'team_kill';
}

/**
 * Fetch enhanced match data including live stats, player performance, and round results
 */
export async function fetchEnhancedFaceitMatchData(matchId: string): Promise<{
  matchData: EnhancedMatchData;
  playerPerformances: PlayerMatchPerformance[];
  roundResults: RoundResult[];
  killFeed: KillFeedEntry[];
  liveStats?: LiveMatchStats;
} | null> {
  try {
    console.log('🎮 Fetching enhanced FACEIT match data for:', matchId);

    // Fetch main match data with enhanced fields
    const { data: matchData, error: matchError } = await supabase
      .from('faceit_matches')
      .select(`
        match_id,
        status,
        match_phase,
        current_round,
        round_timer_seconds,
        overtime_rounds,
        live_team_scores,
        maps_played,
        round_results,
        live_player_status,
        kill_feed,
        economy_data,
        objectives_status,
        auto_refresh_interval,
        teams,
        faceit_data,
        started_at,
        finished_at,
        scheduled_at,
        created_at,
        competition_name,
        competition_type,
        region,
        raw_data
      `)
      .eq('match_id', matchId)
      .maybeSingle();

    if (matchError || !matchData) {
      console.error('❌ Error fetching match data:', matchError);
      return null;
    }

    // Fetch player performance data
    const { data: playerPerformances, error: performanceError } = await supabase
      .from('faceit_player_match_performance')
      .select('*')
      .eq('match_id', matchId);

    if (performanceError) {
      console.warn('⚠️ Error fetching player performances:', performanceError);
    }

    // Fetch round results
    const { data: roundResults, error: roundsError } = await supabase
      .from('faceit_match_rounds')
      .select('*')
      .eq('match_id', matchId)
      .order('round_number', { ascending: true });

    if (roundsError) {
      console.warn('⚠️ Error fetching round results:', roundsError);
    }

    // Fetch kill feed
    const { data: killFeed, error: killFeedError } = await supabase
      .from('faceit_match_kill_feed')
      .select('*')
      .eq('match_id', matchId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (killFeedError) {
      console.warn('⚠️ Error fetching kill feed:', killFeedError);
    }

    // Fetch live stats if match is live
    let liveStats: LiveMatchStats | undefined;
    if (matchData.status === 'live' || matchData.match_phase === 'live') {
      const { data: liveStatsData, error: liveStatsError } = await supabase
        .from('faceit_live_match_stats')
        .select('*')
        .eq('match_id', matchId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (liveStatsError) {
        console.warn('⚠️ Error fetching live stats:', liveStatsError);
      } else if (liveStatsData) {
        liveStats = {
          matchId: liveStatsData.match_id,
          roundNumber: liveStatsData.round_number,
          roundPhase: liveStatsData.round_phase,
          roundTimer: liveStatsData.round_timer_seconds,
          teamScores: (liveStatsData.team_scores as any) || { faction1: 0, faction2: 0 },
          playerPositions: (liveStatsData.player_positions as any) || {},
          playerHealth: (liveStatsData.player_health as any) || {},
          playerArmor: (liveStatsData.player_armor as any) || {},
          playerWeapons: (liveStatsData.player_weapons as any) || {},
          playerMoney: (liveStatsData.player_money as any) || {},
          bombStatus: (liveStatsData.bomb_status as any) || 'none',
          bombSite: liveStatsData.bomb_site,
          bombTimer: liveStatsData.bomb_timer_seconds
        };
      }
    }

    // Transform the data to match our interface
    const enhancedMatchData: EnhancedMatchData = {
      matchId: matchData.match_id,
      status: matchData.status,
      matchPhase: matchData.match_phase || undefined,
      currentRound: matchData.current_round || undefined,
      roundTimer: matchData.round_timer_seconds || undefined,
      overtimeRounds: matchData.overtime_rounds || undefined,
      teams: (() => {
        const teams = matchData.teams as any;
        if (teams && typeof teams === 'object' && teams.faction1 && teams.faction2) {
          // Transform team data to include proper logo field and ensure array format
          const team1 = {
            ...teams.faction1,
            logo: teams.faction1.avatar || teams.faction1.logo || '/placeholder.svg'
          };
          const team2 = {
            ...teams.faction2,
            logo: teams.faction2.avatar || teams.faction2.logo || '/placeholder.svg'
          };
          return [team1, team2];
        }
        return Array.isArray(teams) ? teams : [];
      })(),
      liveTeamScores: (matchData.live_team_scores as any) || undefined,
      mapsPlayed: (matchData.maps_played as any) || [],
      roundResults: (matchData.round_results as any) || [],
      livePlayerStatus: (matchData.live_player_status as any) || {},
      killFeed: (matchData.kill_feed as any) || [],
      economyData: (matchData.economy_data as any) || {},
      objectivesStatus: (matchData.objectives_status as any) || {},
      autoRefreshInterval: matchData.auto_refresh_interval || 15000,
      faceitData: {
        ...(matchData.faceit_data && typeof matchData.faceit_data === 'object' ? matchData.faceit_data : {}),
        region: matchData.region || (matchData.faceit_data as any)?.region,
        competitionType: matchData.competition_type || (matchData.faceit_data as any)?.competition_type,
        competitionName: matchData.competition_name || (matchData.faceit_data as any)?.competition_name
      },
      startTime: matchData.scheduled_at || undefined, // Only use scheduled_at, don't fallback to created_at
      started_at: matchData.started_at || undefined,
      finished_at: matchData.finished_at || undefined,
      bestOf: (() => {
        const rawData = matchData.raw_data as any;
        return rawData?.best_of || 1;
      })()
    };

    // Transform player performances
    const transformedPlayerPerformances: PlayerMatchPerformance[] = (playerPerformances || []).map(player => ({
      playerId: player.player_id,
      nickname: player.player_nickname,
      teamFaction: player.team_faction as 'faction1' | 'faction2',
      kills: player.kills || 0,
      deaths: player.deaths || 0,
      assists: player.assists || 0,
      score: player.score || 0,
      kdRatio: player.kd_ratio || 0,
      adr: player.adr || 0,
      headshots: player.headshots || 0,
      headshotPercent: player.headshots_percent || 0,
      mvpRounds: player.mvp_rounds || 0,
      rating: player.rating || 0,
      firstKills: player.first_kills || 0,
      firstDeaths: player.first_deaths || 0,
      clutchRoundsWon: player.clutch_rounds_won || 0,
      clutchRoundsAttempted: player.clutch_rounds_attempted || 0,
      damageDealt: player.damage_dealt || 0,
      flashAssists: player.flash_assists || 0
    }));

    // Transform round results
    const transformedRoundResults: RoundResult[] = (roundResults || []).map(round => ({
      roundNumber: round.round_number,
      mapName: round.map_name || '',
      winningFaction: round.winning_faction as 'faction1' | 'faction2',
      roundType: round.round_type as 'pistol' | 'eco' | 'force' | 'full_buy' | 'anti_eco',
      roundEndReason: round.round_end_reason as 'elimination' | 'bomb_defused' | 'bomb_exploded' | 'time_expired' | 'surrender',
      roundDuration: round.round_duration_seconds || 0,
      faction1ScoreBefore: round.faction1_score_before || 0,
      faction2ScoreBefore: round.faction2_score_before || 0,
      faction1ScoreAfter: round.faction1_score_after || 0,
      faction2ScoreAfter: round.faction2_score_after || 0,
      bombPlanted: round.bomb_planted || false,
      bombDefused: round.bomb_defused || false,
      bombExploded: round.bomb_exploded || false,
      firstKillPlayer: round.first_kill_player || '',
      roundMvp: round.round_mvp_player || ''
    }));

    // Transform kill feed
    const transformedKillFeed: KillFeedEntry[] = (killFeed || []).map(kill => ({
      matchId: kill.match_id,
      roundNumber: kill.round_number,
      timestamp: kill.timestamp,
      roundTime: kill.round_time_seconds || 0,
      killerId: kill.killer_player_id || '',
      killerNickname: kill.killer_nickname || '',
      killerTeam: kill.killer_team as 'faction1' | 'faction2',
      victimId: kill.victim_player_id || '',
      victimNickname: kill.victim_nickname || '',
      victimTeam: kill.victim_team as 'faction1' | 'faction2',
      weapon: kill.weapon || '',
      headshot: kill.headshot || false,
      wallbang: kill.wallbang || false,
      eventType: kill.event_type as 'kill' | 'assist' | 'suicide' | 'team_kill'
    }));

    console.log('✅ Successfully fetched enhanced FACEIT match data');
    
    return {
      matchData: enhancedMatchData,
      playerPerformances: transformedPlayerPerformances,
      roundResults: transformedRoundResults,
      killFeed: transformedKillFeed,
      liveStats
    };

  } catch (error) {
    console.error('❌ Error in fetchEnhancedFaceitMatchData:', error);
    return null;
  }
}

/**
 * Update live match stats - called during live matches for real-time updates
 */
export async function updateLiveMatchStats(matchId: string, liveStats: Partial<LiveMatchStats>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('faceit_live_match_stats')
      .upsert({
        match_id: matchId,
        round_number: liveStats.roundNumber || 0,
        round_phase: liveStats.roundPhase || 'live',
        round_timer_seconds: liveStats.roundTimer || 0,
        team_scores: liveStats.teamScores || { faction1: 0, faction2: 0 },
        player_positions: liveStats.playerPositions || {},
        player_health: liveStats.playerHealth || {},
        player_armor: liveStats.playerArmor || {},
        player_weapons: liveStats.playerWeapons || {},
        player_money: liveStats.playerMoney || {},
        bomb_status: liveStats.bombStatus || 'none',
        bomb_site: liveStats.bombSite,
        bomb_timer_seconds: liveStats.bombTimer,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'match_id'
      });

    if (error) {
      console.error('❌ Error updating live match stats:', error);
      return false;
    }

    console.log('✅ Successfully updated live match stats');
    return true;
  } catch (error) {
    console.error('❌ Error in updateLiveMatchStats:', error);
    return false;
  }
}

/**
 * Add kill feed entry - called during live matches for real-time kill feed
 */
export async function addKillFeedEntry(killData: Omit<KillFeedEntry, 'timestamp'>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('faceit_match_kill_feed')
      .insert({
        match_id: killData.matchId,
        round_number: killData.roundNumber,
        round_time_seconds: killData.roundTime,
        killer_player_id: killData.killerId,
        killer_nickname: killData.killerNickname,
        killer_team: killData.killerTeam,
        victim_player_id: killData.victimId,
        victim_nickname: killData.victimNickname,
        victim_team: killData.victimTeam,
        weapon: killData.weapon,
        headshot: killData.headshot,
        wallbang: killData.wallbang,
        event_type: killData.eventType,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('❌ Error adding kill feed entry:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error in addKillFeedEntry:', error);
    return false;
  }
}

/**
 * Trigger live data sync for a specific match - calls edge function to fetch latest data
 */
export async function triggerLiveMatchSync(matchId: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('sync-faceit-live-match', {
      body: { matchId }
    });

    if (error) {
      console.error('❌ Error triggering live match sync:', error);
      return false;
    }

    console.log('✅ Successfully triggered live match sync');
    return true;
  } catch (error) {
    console.error('❌ Error in triggerLiveMatchSync:', error);
    return false;
  }
}