import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const { round_id } = await req.json();
    if (!round_id) {
      throw new Error("round_id is required");
    }

    console.log(`Tracking affiliate activation for user ${user.id}, round ${round_id}`);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's referrer code from their profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('referrer_code')
      .eq('id', user.id)
      .single();

    if (!profile?.referrer_code) {
      console.log('User has no referrer code - skipping affiliate tracking');
      return new Response(
        JSON.stringify({ success: true, message: "No referrer to track" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`User has referrer code: ${profile.referrer_code}`);

    // Look up the affiliate by referral code
    const { data: affiliate } = await supabaseAdmin
      .from('creator_affiliates')
      .select('id, compensation_type, pay_per_play_rate, rev_share_percent')
      .eq('referral_code', profile.referrer_code)
      .eq('status', 'active')
      .single();

    if (!affiliate) {
      console.log('No active affiliate found for referrer code');
      return new Response(
        JSON.stringify({ success: true, message: "No active affiliate for referrer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found affiliate: ${affiliate.id}, compensation: ${affiliate.compensation_type}`);

    if (affiliate.compensation_type === 'pay_per_play') {
      // Check if user already has an activation record for this affiliate
      const { data: existingActivation } = await supabaseAdmin
        .from('affiliate_activations')
        .select('id, activated')
        .eq('creator_id', affiliate.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingActivation) {
        // First time this user is playing - create activation
        const payoutAmount = affiliate.pay_per_play_rate || 50;

        const { error: activationError } = await supabaseAdmin
          .from('affiliate_activations')
          .insert({
            creator_id: affiliate.id,
            user_id: user.id,
            registered_at: new Date().toISOString(),
            first_round_played_at: new Date().toISOString(),
            round_id: round_id,
            activated: true,
            payout_amount: payoutAmount,
          });

        if (activationError) {
          console.error('Error creating affiliate activation:', activationError);
        } else {
          console.log(`Pay-per-play activation created: creator=${affiliate.id}, user=${user.id}, payout=${payoutAmount} cents`);
        }
      } else if (!existingActivation.activated) {
        // User exists but not activated yet - update to activated
        const payoutAmount = affiliate.pay_per_play_rate || 50;

        const { error: updateError } = await supabaseAdmin
          .from('affiliate_activations')
          .update({
            activated: true,
            first_round_played_at: new Date().toISOString(),
            round_id: round_id,
            payout_amount: payoutAmount,
          })
          .eq('id', existingActivation.id);

        if (updateError) {
          console.error('Error updating affiliate activation:', updateError);
        } else {
          console.log(`Pay-per-play activation updated: creator=${affiliate.id}, user=${user.id}`);
        }
      } else {
        console.log('User already activated for this affiliate - skipping');
      }
    } else {
      // Revenue share - log earnings for this entry
      // Get round details to determine entry fee
      const { data: round } = await supabaseAdmin
        .from('fantasy_rounds')
        .select('entry_fee')
        .eq('id', round_id)
        .single();

      const entryFee = round?.entry_fee || 0;

      if (entryFee > 0) {
        const revSharePercent = affiliate.rev_share_percent || 10;
        const earningsAmount = Math.round((entryFee * revSharePercent) / 100);

        const { error: earningsError } = await supabaseAdmin
          .from('affiliate_earnings')
          .insert({
            creator_id: affiliate.id,
            user_id: user.id,
            round_id: round_id,
            entry_fee: entryFee,
            rev_share_percent: revSharePercent,
            earnings_amount: earningsAmount,
          });

        if (earningsError) {
          console.error('Error creating affiliate earnings:', earningsError);
        } else {
          console.log(`Revenue share earnings created: creator=${affiliate.id}, user=${user.id}, amount=${earningsAmount}`);
        }
      } else {
        console.log('Free round - no revenue share to track');
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Affiliate activation tracked" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error tracking affiliate activation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
