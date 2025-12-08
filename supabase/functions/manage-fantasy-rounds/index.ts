import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds, format } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoundVariant {
  team_type: 'pro' | 'amateur' | 'both';
  is_paid: boolean;
  entry_fee: number | null;
  prize_type: 'vouchers' | 'credits';
  prize_1st: number;
  prize_2nd: number;
  prize_3rd: number;
  section_name: string;
  name_suffix: string;
}

const DAILY_VARIANTS: RoundVariant[] = [
  { team_type: 'pro', is_paid: true, entry_fee: 150, prize_type: 'vouchers', prize_1st: 25, prize_2nd: 10, prize_3rd: 4, section_name: 'Quick Fire Paid', name_suffix: 'Pro Paid' },
  { team_type: 'pro', is_paid: false, entry_fee: null, prize_type: 'credits', prize_1st: 25, prize_2nd: 10, prize_3rd: 5, section_name: 'Quick Fire Free', name_suffix: 'Pro Free' },
  { team_type: 'amateur', is_paid: true, entry_fee: 150, prize_type: 'vouchers', prize_1st: 25, prize_2nd: 10, prize_3rd: 4, section_name: 'Quick Fire Paid', name_suffix: 'Amateur Paid' },
  { team_type: 'amateur', is_paid: false, entry_fee: null, prize_type: 'credits', prize_1st: 25, prize_2nd: 10, prize_3rd: 5, section_name: 'Quick Fire Free', name_suffix: 'Amateur Free' },
  { team_type: 'both', is_paid: false, entry_fee: null, prize_type: 'credits', prize_1st: 25, prize_2nd: 10, prize_3rd: 5, section_name: 'Quick Fire Free', name_suffix: 'Mixed Free' },
];

Deno.serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    // Schedule 1 day in advance: tomorrow 9am → day after 9am
    const tomorrow = addDays(now, 1);
    const startDate = setMilliseconds(setSeconds(setMinutes(setHours(tomorrow, 9), 0), 0), 0);
    const endDate = setMilliseconds(setSeconds(setMinutes(setHours(addDays(startDate, 1), 9), 0), 0), 0);

    const dateLabel = format(startDate, 'MMM d');

    // Check if rounds already exist for this date range to prevent duplicates
    const { data: existingRounds } = await supabase
      .from('fantasy_rounds')
      .select('id')
      .eq('type', 'daily')
      .eq('start_date', startDate.toISOString())
      .limit(1);

    if (existingRounds && existingRounds.length > 0) {
      console.log(`⏭️ Daily rounds for ${dateLabel} already exist, skipping creation`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Rounds already exist for this date' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create all 5 variants
    const roundsToCreate = DAILY_VARIANTS.map(variant => ({
      type: 'daily',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status: 'scheduled',
      round_name: `Daily ${variant.name_suffix} - ${dateLabel}`,
      team_type: variant.team_type,
      is_paid: variant.is_paid,
      entry_fee: variant.entry_fee,
      prize_type: variant.prize_type,
      prize_1st: variant.prize_1st,
      prize_2nd: variant.prize_2nd,
      prize_3rd: variant.prize_3rd,
      section_name: variant.section_name,
    }));

    const { data: newRounds, error: insertError } = await supabase
      .from('fantasy_rounds')
      .insert(roundsToCreate)
      .select();

    if (insertError) throw insertError;

    console.log(`🆕 Created ${newRounds?.length || 0} daily rounds for ${dateLabel}`);

    return new Response(
      JSON.stringify({
        success: true,
        created_rounds: newRounds?.length || 0,
        date_range: `${startDate.toISOString()} → ${endDate.toISOString()}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Daily Fantasy Rounds Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
