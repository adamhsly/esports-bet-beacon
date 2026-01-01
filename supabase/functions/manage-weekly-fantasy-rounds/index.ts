import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { addWeeks, startOfWeek, setHours, setMinutes, setSeconds, setMilliseconds, format } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoundVariant {
  team_type: 'pro' | 'amateur' | 'both';
  is_paid: boolean;
  entry_fee: number | null;
  stripe_price_id: string | null;
  prize_type: 'vouchers' | 'credits';
  prize_1st: number;
  prize_2nd: number;
  prize_3rd: number;
  section_name: string;
  name_suffix: string;
}

// Create weekly pro free round and weekly pro paid round
const WEEKLY_VARIANTS: RoundVariant[] = [
  { team_type: 'pro', is_paid: false, entry_fee: null, stripe_price_id: null, prize_type: 'credits', prize_1st: 50, prize_2nd: 25, prize_3rd: 10, section_name: 'Weekly Fun - Free', name_suffix: 'Pro - Free' },
  { team_type: 'pro', is_paid: true, entry_fee: 250, stripe_price_id: null, prize_type: 'vouchers', prize_1st: 2500, prize_2nd: 1000, prize_3rd: 500, section_name: 'Weekly Pro - Paid', name_suffix: 'Pro - Paid' },
];

const MIN_PRO_MATCHES = 3;

Deno.serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    // Schedule 1 week in advance: next week's Monday 9am → following Monday 9am
    const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }); // Monday
    const startDate = setMilliseconds(setSeconds(setMinutes(setHours(nextWeekStart, 9), 0), 0), 0);
    const endDate = setMilliseconds(setSeconds(setMinutes(setHours(addWeeks(startDate, 1), 9), 0), 0), 0);

    const dateLabel = `Week of ${format(startDate, 'MMM d')}`;

    // Check if rounds already exist for this date range to prevent duplicates
    const { data: existingRounds } = await supabase
      .from('fantasy_rounds')
      .select('id')
      .eq('type', 'weekly')
      .eq('start_date', startDate.toISOString())
      .limit(1);

    if (existingRounds && existingRounds.length > 0) {
      console.log(`⏭️ Weekly rounds for ${dateLabel} already exist, skipping creation`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Rounds already exist for this date' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count pro matches scheduled in the round window (from pandascore_matches)
    const { count: proMatchCount, error: countError } = await supabase
      .from('pandascore_matches')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', startDate.toISOString())
      .lt('start_time', endDate.toISOString())
      .in('status', ['not_started', 'running']);

    if (countError) {
      console.error('Error counting pro matches:', countError);
    }

    const hasEnoughProMatches = (proMatchCount ?? 0) >= MIN_PRO_MATCHES;
    console.log(`📊 Pro match count for ${dateLabel}: ${proMatchCount ?? 0} (minimum: ${MIN_PRO_MATCHES})`);

    if (!hasEnoughProMatches) {
      console.log(`⏭️ Skipping weekly pro round creation - insufficient pro matches (${proMatchCount ?? 0} < ${MIN_PRO_MATCHES})`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: 'Insufficient pro matches for round creation',
          pro_match_count: proMatchCount ?? 0,
          min_required: MIN_PRO_MATCHES
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the weekly pro free round
    const roundsToCreate = WEEKLY_VARIANTS.map(variant => ({
      type: 'weekly',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      status: 'scheduled',
      round_name: `Weekly ${variant.name_suffix} - ${dateLabel}`,
      team_type: variant.team_type,
      is_paid: variant.is_paid,
      entry_fee: variant.entry_fee,
      stripe_price_id: variant.stripe_price_id,
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

    console.log(`🆕 Created ${newRounds?.length || 0} weekly rounds for ${dateLabel}`);

    // Calculate team prices for each new round
    const priceResults: any[] = [];
    for (const round of newRounds || []) {
      console.log(`💰 Calculating team prices for round: ${round.round_name} (${round.id})`);
      try {
        const priceResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-team-prices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ round_id: round.id }),
        });
        
        if (!priceResponse.ok) {
          console.error(`❌ Failed to calculate prices for ${round.round_name}: ${priceResponse.status}`);
          priceResults.push({ round_id: round.id, success: false, error: `HTTP ${priceResponse.status}` });
        } else {
          const result = await priceResponse.json();
          console.log(`✅ Calculated ${result.updated || 0} team prices for ${round.round_name}`);
          priceResults.push({ round_id: round.id, success: true, teams_priced: result.updated || 0 });
        }
      } catch (err: any) {
        console.error(`❌ Error calculating prices for ${round.round_name}:`, err);
        priceResults.push({ round_id: round.id, success: false, error: err?.message || String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        created_rounds: newRounds?.length || 0,
        pro_match_count: proMatchCount ?? 0,
        min_required: MIN_PRO_MATCHES,
        date_range: `${startDate.toISOString()} → ${endDate.toISOString()}`,
        price_calculations: priceResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Weekly Fantasy Rounds Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
