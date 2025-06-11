
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const startTime = Date.now();
  let totalProcessed = 0;
  let totalAdded = 0;
  let totalUpdated = 0;

  // Log sync start
  const { data: logEntry } = await supabase
    .from('sportdevs_sync_logs')
    .insert({
      sync_type: 'upcoming_matches',
      status: 'running'
    })
    .select()
    .single();

  try {
    // Get API key from Supabase secrets
    const apiKey = Deno.env.get('SPORTDEVS_API_KEY');
    if (!apiKey) {
      throw new Error('SPORTDEVS_API_KEY not found in environment variables');
    }
    
    console.log('🔄 Starting SportDevs upcoming matches sync using working API endpoint...');

    // Use the working API endpoint from EsportPage
    const url = 'https://esports.sportdevs.com/matches?status_type=eq.upcoming&limit=50';
    console.log(`📡 Calling API: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    console.log(`📊 Response status: ${response.status}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error(`❌ Unauthorized: Check API key`);
        throw new Error(`Unauthorized access. Please verify your API key.`);
      } else {
        const errorText = await response.text();
        console.error(`❌ Error fetching upcoming matches: ${response.status} ${response.statusText} - ${errorText}`);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }

    const matches = await response.json();
    console.log(`📊 Found ${matches.length} upcoming matches`);

    for (const match of matches) {
      totalProcessed++;
      
      // Extract team names from match name if opponents not available
      const extractTeamNames = (matchName: string): [string, string] => {
        if (!matchName || !matchName.includes(' vs ')) {
          return ['N/A', 'N/A'];
        }
        const parts = matchName.split(' vs ');
        const team1 = parts[0].trim();
        const team2 = parts.length > 1 ? parts[1].trim() : 'N/A';
        return [team1, team2];
      };

      // Transform match data using EsportPage logic
      let teams = [];
      
      if (match.opponents?.length > 0) {
        teams = match.opponents.slice(0, 2).map((opponent: any) => ({
          id: opponent.id || `team-${opponent.name || 'unknown'}`,
          name: opponent.name || 'Unknown Team',
          logo: opponent.hash_image ? `https://images.sportdevs.com/${opponent.hash_image}.png` : '/placeholder.svg',
          image_url: opponent.image_url || null,
          hash_image: opponent.hash_image || null
        }));
      } else if (match.home_team_name && match.away_team_name) {
        teams = [
          {
            id: match.home_team_id || `team-${match.home_team_name || 'unknown'}`,
            name: match.home_team_name || 'Unknown Team',
            logo: match.home_team_hash_image ? `https://images.sportdevs.com/${match.home_team_hash_image}.png` : '/placeholder.svg',
            image_url: null,
            hash_image: match.home_team_hash_image || null
          },
          {
            id: match.away_team_id || `team-${match.away_team_name || 'unknown'}`,
            name: match.away_team_name || 'Unknown Team',
            logo: match.away_team_hash_image ? `https://images.sportdevs.com/${match.away_team_hash_image}.png` : '/placeholder.svg',
            image_url: null,
            hash_image: match.away_team_hash_image || null
          }
        ];
      } else if (match.name) {
        const [team1Name, team2Name] = extractTeamNames(match.name);
        teams = [
          { 
            name: team1Name, 
            logo: '/placeholder.svg',
            image_url: null,
            hash_image: null,
            id: `team-${team1Name}`
          },
          { 
            name: team2Name, 
            logo: '/placeholder.svg',
            image_url: null,
            hash_image: null,
            id: `team-${team2Name}`
          }
        ];
      }
      
      while (teams.length < 2) {
        teams.push({
          name: 'Unknown Team',
          logo: '/placeholder.svg',
          image_url: null,
          hash_image: null,
          id: 'unknown-team'
        });
      }

      // Determine esport type from videogame or class_name
      let esportType = 'csgo'; // default
      if (match.videogame?.slug) {
        const gameSlug = match.videogame.slug.toLowerCase();
        if (gameSlug.includes('cs') || gameSlug.includes('counter-strike')) {
          esportType = 'csgo';
        } else if (gameSlug.includes('league') || gameSlug.includes('lol')) {
          esportType = 'lol';
        } else if (gameSlug.includes('dota')) {
          esportType = 'dota2';
        } else if (gameSlug.includes('valorant')) {
          esportType = 'valorant';
        } else if (gameSlug.includes('overwatch')) {
          esportType = 'overwatch';
        } else if (gameSlug.includes('rocket') || gameSlug.includes('rl')) {
          esportType = 'rocketleague';
        }
      } else if (match.class_name) {
        const className = match.class_name.toLowerCase();
        if (className.includes('cs') || className.includes('counter')) {
          esportType = 'csgo';
        } else if (className.includes('league') || className.includes('lol')) {
          esportType = 'lol';
        } else if (className.includes('valorant')) {
          esportType = 'valorant';
        } else if (className.includes('overwatch')) {
          esportType = 'overwatch';
        } else if (className.includes('rocket')) {
          esportType = 'rocketleague';
        }
      }

      const matchData = {
        match_id: match.id || `sportdevs_${Date.now()}_${Math.random()}`,
        teams: {
          team1: {
            id: teams[0].id,
            name: teams[0].name,
            logo: teams[0].logo
          },
          team2: {
            id: teams[1].id,
            name: teams[1].name,
            logo: teams[1].logo
          }
        },
        start_time: match.start_time || new Date().toISOString(),
        tournament_id: match.tournament?.id || match.league?.id || match.serie?.id,
        tournament_name: match.league_name || match.tournament?.name || match.serie?.name || 'Unknown Tournament',
        status: 'scheduled',
        esport_type: esportType,
        best_of: match.format?.best_of || 1,
        raw_data: match,
        last_synced_at: new Date().toISOString()
      };

      // Upsert match data
      const { error, data: upsertResult } = await supabase
        .from('sportdevs_matches')
        .upsert(matchData, { 
          onConflict: 'match_id',
          ignoreDuplicates: false 
        })
        .select('id, created_at, updated_at');

      if (error) {
        console.error(`❌ Error upserting match ${matchData.match_id}:`, error);
        continue;
      }

      if (upsertResult && upsertResult.length > 0) {
        const record = upsertResult[0];
        const createdAt = new Date(record.created_at).getTime();
        const updatedAt = new Date(record.updated_at).getTime();
        
        if (Math.abs(createdAt - updatedAt) < 1000) {
          totalAdded++;
          console.log(`✅ Added new upcoming match: ${matchData.match_id}`);
        } else {
          totalUpdated++;
          console.log(`🔄 Updated upcoming match: ${matchData.match_id}`);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Upcoming matches sync completed: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated in ${duration}ms`);

    // Update log entry with success
    if (logEntry) {
      await supabase
        .from('sportdevs_sync_logs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          records_processed: totalProcessed,
          records_added: totalAdded,
          records_updated: totalUpdated,
          metadata: { 
            api_endpoint: url,
            api_key_used: !!apiKey
          }
        })
        .eq('id', logEntry.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        added: totalAdded,
        updated: totalUpdated,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ SportDevs upcoming matches sync failed:', error);

    if (logEntry) {
      await supabase
        .from('sportdevs_sync_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          records_processed: totalProcessed,
          records_added: totalAdded,
          records_updated: totalUpdated,
          error_message: error.message,
          error_details: { stack: error.stack }
        })
        .eq('id', logEntry.id);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        processed: totalProcessed,
        added: totalAdded,
        updated: totalUpdated
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
