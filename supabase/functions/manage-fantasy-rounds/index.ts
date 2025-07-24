import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to create 9am-to-9am window
function createDailyFantasyWindow(date: Date) {
  // Set to 9am UTC for the given date
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0);
  // End is 9am UTC the next day
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  
  return { start: start.toISOString(), end: end.toISOString() };
}

// Get current 9am-to-9am window
function getCurrentFantasyWindow() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check if we're before 9am today - if so, use yesterday's window
  const todayAt9am = new Date(today.getTime());
  todayAt9am.setHours(9, 0, 0, 0);
  
  if (now < todayAt9am) {
    // We're before 9am today, so current window started yesterday at 9am
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    return createDailyFantasyWindow(yesterday);
  } else {
    // We're after 9am today, so current window started today at 9am
    return createDailyFantasyWindow(today);
  }
}

// Get next 9am-to-9am window
function getNextFantasyWindow() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayAt9am = new Date(today.getTime());
  todayAt9am.setHours(9, 0, 0, 0);
  
  if (now < todayAt9am) {
    // We're before 9am today, so next window starts today at 9am
    return createDailyFantasyWindow(today);
  } else {
    // We're after 9am today, so next window starts tomorrow at 9am
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    return createDailyFantasyWindow(tomorrow);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action } = await req.json();

    console.log('Managing fantasy rounds with action:', action);

    if (action === 'create_current_daily') {
      // Create or update current daily round
      const currentWindow = getCurrentFantasyWindow();
      
      console.log('Creating current daily round:', currentWindow);

      // Check if current round already exists
      const { data: existingRound, error: checkError } = await supabase
        .from('fantasy_rounds')
        .select('*')
        .eq('type', 'daily')
        .eq('start_date', currentWindow.start)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (!existingRound) {
        // Create new daily round
        const { data: newRound, error: createError } = await supabase
          .from('fantasy_rounds')
          .insert({
            type: 'daily',
            start_date: currentWindow.start,
            end_date: currentWindow.end,
            status: 'open'
          })
          .select()
          .single();

        if (createError) throw createError;

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Created new daily round',
            round: newRound
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Current daily round already exists',
            round: existingRound
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'create_next_daily') {
      // Create next daily round
      const nextWindow = getNextFantasyWindow();
      
      console.log('Creating next daily round:', nextWindow);

      // Check if next round already exists
      const { data: existingRound, error: checkError } = await supabase
        .from('fantasy_rounds')
        .select('*')
        .eq('type', 'daily')
        .eq('start_date', nextWindow.start)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (!existingRound) {
        // Create new daily round
        const { data: newRound, error: createError } = await supabase
          .from('fantasy_rounds')
          .insert({
            type: 'daily',
            start_date: nextWindow.start,
            end_date: nextWindow.end,
            status: 'open'
          })
          .select()
          .single();

        if (createError) throw createError;

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Created next daily round',
            round: newRound
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Next daily round already exists',
            round: existingRound
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'close_finished_rounds') {
      // Close rounds that have ended
      const now = new Date().toISOString();
      
      const { data: closedRounds, error: closeError } = await supabase
        .from('fantasy_rounds')
        .update({ status: 'closed' })
        .lt('end_date', now)
        .in('status', ['open', 'active'])
        .select();

      if (closeError) throw closeError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Closed ${closedRounds?.length || 0} finished rounds`,
          closedRounds
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'fix_existing_daily') {
      // Fix existing daily rounds to use proper 9am-to-9am timing
      const { data: existingRounds, error: fetchError } = await supabase
        .from('fantasy_rounds')
        .select('*')
        .eq('type', 'daily')
        .in('status', ['open', 'active']);

      if (fetchError) throw fetchError;

      console.log('Found existing daily rounds to fix:', existingRounds?.length);

      for (const round of existingRounds || []) {
        // Determine what the correct 9am-to-9am window should be for this round
        const roundDate = new Date(round.start_date);
        const correctedWindow = createDailyFantasyWindow(roundDate);

        // Update the round with correct timing
        const { error: updateError } = await supabase
          .from('fantasy_rounds')
          .update({
            start_date: correctedWindow.start,
            end_date: correctedWindow.end
          })
          .eq('id', round.id);

        if (updateError) {
          console.error('Error updating round:', round.id, updateError);
        } else {
          console.log('Updated round:', round.id, 'to use 9am-to-9am window');
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Fixed ${existingRounds?.length || 0} existing daily rounds`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in manage-fantasy-rounds:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});