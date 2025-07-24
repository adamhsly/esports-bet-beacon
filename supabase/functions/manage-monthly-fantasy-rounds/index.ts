import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { setHours, setMinutes, setSeconds, setMilliseconds, isBefore } from 'https://esm.sh/date-fns@3.6.0';

// Helper functions for monthly fantasy windows (1st of month 9am to 1st of next month 9am)
const createMonthlyFantasyWindow = (date: Date) => {
  // Set to first day of the month at 9am UTC
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = setMilliseconds(setSeconds(setMinutes(setHours(firstDay, 9), 0), 0), 0);
  
  // End is first day of next month at 9am UTC
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const end = setMilliseconds(setSeconds(setMinutes(setHours(nextMonth, 9), 0), 0), 0);
  
  return { start, end };
};

const getCurrentMonthlyFantasyWindow = () => {
  const now = new Date();
  const thisMonthWindow = createMonthlyFantasyWindow(now);
  
  // Check if we're before the start of this month's window
  if (isBefore(now, thisMonthWindow.start)) {
    // We're before this month's 1st at 9am, so current window is last month
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return createMonthlyFantasyWindow(lastMonth);
  } else {
    // We're after this month's 1st at 9am, so current window is this month
    return thisMonthWindow;
  }
};

const getNextMonthlyFantasyWindow = () => {
  const now = new Date();
  const thisMonthWindow = createMonthlyFantasyWindow(now);
  
  if (isBefore(now, thisMonthWindow.start)) {
    // We're before this month's 1st at 9am, so next window is this month
    return thisMonthWindow;
  } else {
    // We're after this month's 1st at 9am, so next window is next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return createMonthlyFantasyWindow(nextMonth);
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
    console.log(`🗓️ Monthly Fantasy Rounds: Processing action "${action}"`);

    switch (action) {
      case 'create_current_monthly': {
        const { start, end } = getCurrentMonthlyFantasyWindow();
        console.log(`📅 Creating current monthly round: ${start.toISOString()} to ${end.toISOString()}`);
        
        const { data: existingRound } = await supabase
          .from('fantasy_rounds')
          .select('*')
          .eq('type', 'monthly')
          .eq('status', 'open')
          .gte('end_date', new Date().toISOString())
          .single();

        if (existingRound) {
          console.log(`📝 Updating existing monthly round: ${existingRound.id}`);
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
            action: 'updated_current_monthly',
            round_id: existingRound.id,
            start_date: start.toISOString(),
            end_date: end.toISOString()
          }), { headers: corsHeaders });
        } else {
          console.log(`🆕 Creating new monthly round`);
          const { data, error } = await supabase
            .from('fantasy_rounds')
            .insert({
              type: 'monthly',
              start_date: start.toISOString(),
              end_date: end.toISOString(),
              status: 'open'
            })
            .select()
            .single();

          if (error) throw error;
          return new Response(JSON.stringify({ 
            success: true, 
            action: 'created_current_monthly',
            round: data
          }), { headers: corsHeaders });
        }
      }

      case 'create_next_monthly': {
        const { start, end } = getNextMonthlyFantasyWindow();
        console.log(`📅 Creating next monthly round: ${start.toISOString()} to ${end.toISOString()}`);
        
        const { data: existingRound } = await supabase
          .from('fantasy_rounds')
          .select('*')
          .eq('type', 'monthly')
          .eq('start_date', start.toISOString())
          .single();

        if (!existingRound) {
          const { data, error } = await supabase
            .from('fantasy_rounds')
            .insert({
              type: 'monthly',
              start_date: start.toISOString(),
              end_date: end.toISOString(),
              status: 'open'
            })
            .select()
            .single();

          if (error) throw error;
          console.log(`🆕 Created next monthly round: ${data.id}`);
          return new Response(JSON.stringify({ 
            success: true, 
            action: 'created_next_monthly',
            round: data
          }), { headers: corsHeaders });
        } else {
          console.log(`✅ Next monthly round already exists: ${existingRound.id}`);
          return new Response(JSON.stringify({ 
            success: true, 
            action: 'next_monthly_exists',
            round: existingRound
          }), { headers: corsHeaders });
        }
      }

      case 'close_finished_rounds': {
        const now = new Date().toISOString();
        console.log(`🔒 Closing finished monthly rounds (end_date <= ${now})`);
        
        const { data, error } = await supabase
          .from('fantasy_rounds')
          .update({ status: 'closed', updated_at: now })
          .eq('type', 'monthly')
          .eq('status', 'open')
          .lte('end_date', now)
          .select();

        if (error) throw error;
        
        console.log(`✅ Closed ${data?.length || 0} finished monthly rounds`);
        return new Response(JSON.stringify({ 
          success: true, 
          action: 'closed_finished_monthly',
          closed_rounds: data?.length || 0,
          rounds: data
        }), { headers: corsHeaders });
      }

      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid action. Use: create_current_monthly, create_next_monthly, or close_finished_rounds' 
        }), { 
          status: 400, 
          headers: corsHeaders 
        });
    }

  } catch (error) {
    console.error('❌ Monthly Fantasy Rounds Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});