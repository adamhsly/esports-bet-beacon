import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds, isBefore } from 'https://esm.sh/date-fns@3.6.0';

// Helper functions for weekly fantasy windows (Monday 9am to next Monday 9am)
const createWeeklyFantasyWindow = (date: Date) => {
  // Find the Monday of the given week at 9am UTC
  const dayOfWeek = date.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so we need -6, otherwise 1 - dayOfWeek
  
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + daysToMonday);
  const start = setMilliseconds(setSeconds(setMinutes(setHours(monday, 9), 0), 0), 0);
  
  // End is next Monday at 9am UTC
  const end = addDays(start, 7);
  
  return { start, end };
};

const getCurrentWeeklyFantasyWindow = () => {
  const now = new Date();
  const currentWeekWindow = createWeeklyFantasyWindow(now);
  
  // Check if we're before the start of current week window
  if (isBefore(now, currentWeekWindow.start)) {
    // We're before this week's Monday 9am, so current window is last week
    const lastWeek = addDays(now, -7);
    return createWeeklyFantasyWindow(lastWeek);
  } else {
    // We're after this week's Monday 9am, so current window is this week
    return currentWeekWindow;
  }
};

const getNextWeeklyFantasyWindow = () => {
  const now = new Date();
  const currentWeekWindow = createWeeklyFantasyWindow(now);
  
  if (isBefore(now, currentWeekWindow.start)) {
    // We're before this week's Monday 9am, so next window is this week
    return currentWeekWindow;
  } else {
    // We're after this week's Monday 9am, so next window is next week
    const nextWeek = addDays(now, 7);
    return createWeeklyFantasyWindow(nextWeek);
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action } = await req.json();
    console.log(`🗓️ Weekly Fantasy Rounds: Processing action "${action}"`);

    switch (action) {
      case 'create_current_weekly': {
        const { start, end } = getCurrentWeeklyFantasyWindow();
        console.log(`📅 Creating current weekly round: ${start.toISOString()} to ${end.toISOString()}`);
        
        const { data: existingRound } = await supabase
          .from('fantasy_rounds')
          .select('*')
          .eq('type', 'weekly')
          .eq('status', 'open')
          .gte('end_date', new Date().toISOString())
          .single();

        if (existingRound) {
          console.log(`📝 Updating existing weekly round: ${existingRound.id}`);
          const { error } = await supabase
            .from('fantasy_rounds')
            .update({
              start_date: start.toISOString(),
              end_date: end.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRound.id);

          if (error) throw error;
          return new Response(JSON.stringify({ 
            success: true, 
            action: 'updated_current_weekly',
            round_id: existingRound.id,
            start_date: start.toISOString(),
            end_date: end.toISOString()
          }), { headers: corsHeaders });
        } else {
          console.log(`🆕 Creating new weekly round`);
          const { data, error } = await supabase
            .from('fantasy_rounds')
            .insert({
              type: 'weekly',
              start_date: start.toISOString(),
              end_date: end.toISOString(),
              status: 'open'
            })
            .select()
            .single();

          if (error) throw error;
          return new Response(JSON.stringify({ 
            success: true, 
            action: 'created_current_weekly',
            round: data
          }), { headers: corsHeaders });
        }
      }

      case 'create_next_weekly': {
        const { start, end } = getNextWeeklyFantasyWindow();
        console.log(`📅 Creating next weekly round: ${start.toISOString()} to ${end.toISOString()}`);
        
        const { data: existingRound } = await supabase
          .from('fantasy_rounds')
          .select('*')
          .eq('type', 'weekly')
          .eq('start_date', start.toISOString())
          .single();

        if (!existingRound) {
          const { data, error } = await supabase
            .from('fantasy_rounds')
            .insert({
              type: 'weekly',
              start_date: start.toISOString(),
              end_date: end.toISOString(),
              status: 'open'
            })
            .select()
            .single();

          if (error) throw error;
          console.log(`🆕 Created next weekly round: ${data.id}`);
          return new Response(JSON.stringify({ 
            success: true, 
            action: 'created_next_weekly',
            round: data
          }), { headers: corsHeaders });
        } else {
          console.log(`✅ Next weekly round already exists: ${existingRound.id}`);
          return new Response(JSON.stringify({ 
            success: true, 
            action: 'next_weekly_exists',
            round: existingRound
          }), { headers: corsHeaders });
        }
      }

      case 'close_finished_rounds': {
        const now = new Date().toISOString();
        console.log(`🔒 Closing finished weekly rounds (end_date <= ${now})`);
        
        const { data, error } = await supabase
          .from('fantasy_rounds')
          .update({ status: 'closed', updated_at: now })
          .eq('type', 'weekly')
          .eq('status', 'open')
          .lte('end_date', now)
          .select();

        if (error) throw error;
        
        console.log(`✅ Closed ${data?.length || 0} finished weekly rounds`);
        return new Response(JSON.stringify({ 
          success: true, 
          action: 'closed_finished_weekly',
          closed_rounds: data?.length || 0,
          rounds: data
        }), { headers: corsHeaders });
      }

      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid action. Use: create_current_weekly, create_next_weekly, or close_finished_rounds' 
        }), { 
          status: 400, 
          headers: corsHeaders 
        });
    }

  } catch (error) {
    console.error('❌ Weekly Fantasy Rounds Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});