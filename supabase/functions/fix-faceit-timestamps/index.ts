
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to convert Faceit timestamp (Unix seconds) to ISO string
function convertFaceitTimestamp(timestamp: string | number | undefined): string | null {
  if (!timestamp) return null;
  
  // If it's already a string that looks like an ISO date, return it
  if (typeof timestamp === 'string' && timestamp.includes('T')) {
    return timestamp;
  }
  
  // Convert to number if it's a string
  const unixSeconds = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  
  // Check if it's a valid Unix timestamp (should be a reasonable number)
  if (isNaN(unixSeconds) || unixSeconds <= 0) {
    return null;
  }
  
  // Convert from seconds to milliseconds and create ISO string
  return new Date(unixSeconds * 1000).toISOString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    console.log('🔧 Starting Faceit timestamp fix...');

    // Get all matches with potential timestamp issues
    const { data: matches, error } = await supabase
      .from('faceit_matches')
      .select('id, match_id, raw_data, scheduled_at, started_at, finished_at, configured_at')
      .not('raw_data', 'is', null);

    if (error) {
      console.error('❌ Error fetching matches:', error);
      throw error;
    }

    console.log(`📊 Found ${matches?.length || 0} matches to potentially fix`);

    let fixed = 0;
    let errors = 0;

    for (const match of matches || []) {
      try {
        const rawData = match.raw_data as any;
        
        // Check if we need to fix timestamps
        const needsFix = 
          (match.scheduled_at && new Date(match.scheduled_at).getFullYear() === 1970) ||
          (match.started_at && new Date(match.started_at).getFullYear() === 1970) ||
          (match.finished_at && new Date(match.finished_at).getFullYear() === 1970) ||
          (match.configured_at && new Date(match.configured_at).getFullYear() === 1970);

        if (!needsFix) {
          continue;
        }

        // Extract timestamps from raw_data and convert them properly
        const fixedData: any = {};
        
        if (rawData.scheduled_at) {
          const fixed = convertFaceitTimestamp(rawData.scheduled_at);
          if (fixed) {
            fixedData.scheduled_at = fixed;
            console.log(`📅 Fixing scheduled_at for ${match.match_id}: ${rawData.scheduled_at} -> ${fixed}`);
          }
        }
        
        if (rawData.started_at) {
          const fixed = convertFaceitTimestamp(rawData.started_at);
          if (fixed) {
            fixedData.started_at = fixed;
            console.log(`🏁 Fixing started_at for ${match.match_id}: ${rawData.started_at} -> ${fixed}`);
          }
        }
        
        if (rawData.finished_at) {
          const fixed = convertFaceitTimestamp(rawData.finished_at);
          if (fixed) {
            fixedData.finished_at = fixed;
            console.log(`🏁 Fixing finished_at for ${match.match_id}: ${rawData.finished_at} -> ${fixed}`);
          }
        }
        
        if (rawData.configured_at) {
          const fixed = convertFaceitTimestamp(rawData.configured_at);
          if (fixed) {
            fixedData.configured_at = fixed;
            console.log(`⚙️ Fixing configured_at for ${match.match_id}: ${rawData.configured_at} -> ${fixed}`);
          }
        }

        // Update the record if we have fixes
        if (Object.keys(fixedData).length > 0) {
          const { error: updateError } = await supabase
            .from('faceit_matches')
            .update(fixedData)
            .eq('id', match.id);

          if (updateError) {
            console.error(`❌ Error updating match ${match.match_id}:`, updateError);
            errors++;
          } else {
            console.log(`✅ Fixed timestamps for match ${match.match_id}`);
            fixed++;
          }
        }

      } catch (error) {
        console.error(`❌ Error processing match ${match.match_id}:`, error);
        errors++;
      }
    }

    console.log(`🎯 Timestamp fix completed: ${fixed} fixed, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        fixed,
        errors,
        total_processed: matches?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Faceit timestamp fix failed:', error);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
