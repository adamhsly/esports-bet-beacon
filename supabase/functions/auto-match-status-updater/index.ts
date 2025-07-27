import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchStatusUpdate {
  matchId: string;
  provider: 'faceit' | 'pandascore';
  oldStatus: string;
  newStatus: string;
  reason: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔄 Starting automated match status update process...');

    const now = new Date();
    const updates: MatchStatusUpdate[] = [];

    // ===============================
    // FACEIT MATCHES STATUS UPDATES
    // ===============================
    
    console.log('📋 Checking FACEIT matches for status updates...');
    
    // Get FACEIT matches that should transition to live
    const { data: faceitUpcomingMatches, error: faceitUpcomingError } = await supabase
      .from('faceit_matches')
      .select('match_id, status, scheduled_at, started_at, finished_at')
      .in('status', ['upcoming', 'READY', 'CONFIGURING'])
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now.toISOString());

    if (faceitUpcomingError) {
      console.error('❌ Error fetching FACEIT upcoming matches:', faceitUpcomingError);
    } else if (faceitUpcomingMatches && faceitUpcomingMatches.length > 0) {
      console.log(`🎮 Found ${faceitUpcomingMatches.length} FACEIT matches to transition to live`);
      
      for (const match of faceitUpcomingMatches) {
        const { error: updateError } = await supabase
          .from('faceit_matches')
          .update({
            status: 'ONGOING',
            match_phase: 'live',
            started_at: match.started_at || now.toISOString(),
            last_live_update: now.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('match_id', match.match_id);

        if (updateError) {
          console.error(`❌ Error updating FACEIT match ${match.match_id}:`, updateError);
        } else {
          updates.push({
            matchId: match.match_id,
            provider: 'faceit',
            oldStatus: match.status,
            newStatus: 'ONGOING',
            reason: 'Scheduled start time reached'
          });
          console.log(`✅ FACEIT match ${match.match_id}: ${match.status} → ONGOING`);
        }
      }
    }

    // Get FACEIT matches that should transition to finished (running for more than 3 hours)
    const threeHoursAgo = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const { data: faceitLiveMatches, error: faceitLiveError } = await supabase
      .from('faceit_matches')
      .select('match_id, status, started_at, last_live_update')
      .in('status', ['ONGOING', 'LIVE'])
      .not('started_at', 'is', null)
      .lte('started_at', threeHoursAgo.toISOString());

    if (faceitLiveError) {
      console.error('❌ Error fetching FACEIT live matches:', faceitLiveError);
    } else if (faceitLiveMatches && faceitLiveMatches.length > 0) {
      console.log(`⏰ Found ${faceitLiveMatches.length} FACEIT matches that may have finished`);
      
      for (const match of faceitLiveMatches) {
        // Only auto-finish if no live updates in the last 30 minutes
        const lastUpdate = match.last_live_update ? new Date(match.last_live_update) : new Date(match.started_at);
        const thirtyMinutesAgo = new Date(now.getTime() - (30 * 60 * 1000));
        
        if (lastUpdate <= thirtyMinutesAgo) {
          const { error: updateError } = await supabase
            .from('faceit_matches')
            .update({
              status: 'FINISHED',
              match_phase: 'finished',
              finished_at: now.toISOString(),
              updated_at: now.toISOString()
            })
            .eq('match_id', match.match_id);

          if (updateError) {
            console.error(`❌ Error finishing FACEIT match ${match.match_id}:`, updateError);
          } else {
            updates.push({
              matchId: match.match_id,
              provider: 'faceit',
              oldStatus: match.status,
              newStatus: 'FINISHED',
              reason: 'No live updates for 30+ minutes, auto-finished'
            });
            console.log(`🏁 FACEIT match ${match.match_id}: ${match.status} → FINISHED (auto-timeout)`);
          }
        }
      }
    }

    // ===============================
    // PANDASCORE MATCHES STATUS UPDATES
    // ===============================
    
    console.log('📋 Checking PandaScore matches for status updates...');
    
    // Get PandaScore matches that should transition to live
    const { data: pandaUpcomingMatches, error: pandaUpcomingError } = await supabase
      .from('pandascore_matches')
      .select('match_id, status, start_time, end_time')
      .in('status', ['not_started', 'scheduled'])
      .not('start_time', 'is', null)
      .lte('start_time', now.toISOString());

    if (pandaUpcomingError) {
      console.error('❌ Error fetching PandaScore upcoming matches:', pandaUpcomingError);
    } else if (pandaUpcomingMatches && pandaUpcomingMatches.length > 0) {
      console.log(`🏆 Found ${pandaUpcomingMatches.length} PandaScore matches to transition to live`);
      
      for (const match of pandaUpcomingMatches) {
        const { error: updateError } = await supabase
          .from('pandascore_matches')
          .update({
            status: 'running',
            updated_at: now.toISOString(),
            last_synced_at: now.toISOString()
          })
          .eq('match_id', match.match_id);

        if (updateError) {
          console.error(`❌ Error updating PandaScore match ${match.match_id}:`, updateError);
        } else {
          updates.push({
            matchId: match.match_id,
            provider: 'pandascore',
            oldStatus: match.status,
            newStatus: 'running',
            reason: 'Scheduled start time reached'
          });
          console.log(`✅ PandaScore match ${match.match_id}: ${match.status} → running`);
        }
      }
    }

    // Get PandaScore matches that should transition to finished (running for more than 4 hours)
    const fourHoursAgo = new Date(now.getTime() - (4 * 60 * 60 * 1000));
    const { data: pandaLiveMatches, error: pandaLiveError } = await supabase
      .from('pandascore_matches')
      .select('match_id, status, start_time, last_synced_at')
      .eq('status', 'running')
      .not('start_time', 'is', null)
      .lte('start_time', fourHoursAgo.toISOString());

    if (pandaLiveError) {
      console.error('❌ Error fetching PandaScore live matches:', pandaLiveError);
    } else if (pandaLiveMatches && pandaLiveMatches.length > 0) {
      console.log(`⏰ Found ${pandaLiveMatches.length} PandaScore matches that may have finished`);
      
      for (const match of pandaLiveMatches) {
        // Only auto-finish if no syncs in the last 45 minutes
        const lastSync = match.last_synced_at ? new Date(match.last_synced_at) : new Date(match.start_time);
        const fortyFiveMinutesAgo = new Date(now.getTime() - (45 * 60 * 1000));
        
        if (lastSync <= fortyFiveMinutesAgo) {
          const { error: updateError } = await supabase
            .from('pandascore_matches')
            .update({
              status: 'finished',
              end_time: now.toISOString(),
              updated_at: now.toISOString(),
              last_synced_at: now.toISOString()
            })
            .eq('match_id', match.match_id);

          if (updateError) {
            console.error(`❌ Error finishing PandaScore match ${match.match_id}:`, updateError);
          } else {
            updates.push({
              matchId: match.match_id,
              provider: 'pandascore',
              oldStatus: match.status,
              newStatus: 'finished',
              reason: 'No sync updates for 45+ minutes, auto-finished'
            });
            console.log(`🏁 PandaScore match ${match.match_id}: ${match.status} → finished (auto-timeout)`);
          }
        }
      }
    }

    // ===============================
    // TRIGGER LIVE DATA SYNC FOR NEW LIVE MATCHES
    // ===============================
    
    const newLiveMatches = updates.filter(update => 
      (update.newStatus === 'ONGOING' || update.newStatus === 'running') && 
      update.reason === 'Scheduled start time reached'
    );

    if (newLiveMatches.length > 0) {
      console.log(`🚀 Triggering live data sync for ${newLiveMatches.length} newly live matches...`);
      
      for (const match of newLiveMatches) {
        try {
          if (match.provider === 'faceit') {
            // Trigger FACEIT live sync
            const { error: syncError } = await supabase.functions.invoke('sync-faceit-live', {
              body: { games: ['cs2'], specificMatches: [match.matchId] }
            });
            
            if (syncError) {
              console.error(`❌ Error triggering FACEIT live sync for ${match.matchId}:`, syncError);
            } else {
              console.log(`✅ Triggered FACEIT live sync for match ${match.matchId}`);
            }
          } else if (match.provider === 'pandascore') {
            // Trigger PandaScore live sync
            const { error: syncError } = await supabase.functions.invoke('sync-pandascore-matches', {
              body: { esportTypes: ['cs2', 'lol', 'dota2'], specificMatches: [match.matchId] }
            });
            
            if (syncError) {
              console.error(`❌ Error triggering PandaScore sync for ${match.matchId}:`, syncError);
            } else {
              console.log(`✅ Triggered PandaScore sync for match ${match.matchId}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error in live sync trigger for ${match.matchId}:`, error);
        }
      }
    }

    // ===============================
    // SUMMARY AND RESPONSE
    // ===============================
    
    const faceitUpdates = updates.filter(u => u.provider === 'faceit');
    const pandaUpdates = updates.filter(u => u.provider === 'pandascore');
    
    const summary = {
      timestamp: now.toISOString(),
      totalUpdates: updates.length,
      faceitUpdates: faceitUpdates.length,
      pandascoreUpdates: pandaUpdates.length,
      newLiveMatches: newLiveMatches.length,
      updates: updates
    };

    console.log('📊 Match Status Update Summary:', summary);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully processed ${updates.length} match status updates`,
      summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in auto-match-status-updater:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});