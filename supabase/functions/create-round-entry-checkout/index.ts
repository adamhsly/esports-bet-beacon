import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

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

    console.log(`Creating checkout for user ${user.id}, round ${round_id}`);

    // Fetch round details to get entry fee and stripe config
    const { data: round, error: roundError } = await supabase
      .from("fantasy_rounds")
      .select("id, entry_fee, is_paid, status, type, round_name, start_date, end_date, stripe_price_id")
      .eq("id", round_id)
      .single();

    if (roundError || !round) {
      throw new Error("Round not found");
    }

    if (!round.is_paid || !round.entry_fee) {
      throw new Error("This is not a paid round");
    }

    if (round.status !== "open" && round.status !== "scheduled") {
      throw new Error("Round is not open for entries");
    }

    console.log(`Round found: ${round.type}, entry fee: ${round.entry_fee} pence`);

    // Use service role to check promo balance
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's promo balance
    const { data: promoStatus } = await supabaseAdmin
      .rpc('get_welcome_offer_status', { p_user_id: user.id });

    const promoBalancePence = promoStatus?.promo_balance_pence || 0;
    const entryFeePence = round.entry_fee;

    console.log(`User promo balance: ${promoBalancePence} pence, entry fee: ${entryFeePence} pence`);

    // Calculate how much promo to use
    const promoToUse = Math.min(promoBalancePence, entryFeePence);
    const stripeAmount = entryFeePence - promoToUse;

    console.log(`Promo to use: ${promoToUse} pence, Stripe amount: ${stripeAmount} pence`);

    // If promo covers entire entry, skip Stripe and complete directly
    if (stripeAmount === 0) {
      console.log('Promo covers entire entry - processing without Stripe');

      // Deduct promo balance
      const { data: deductedAmount, error: deductError } = await supabaseAdmin
        .rpc('deduct_promo_balance', {
          p_user_id: user.id,
          p_amount_pence: promoToUse
        });

      if (deductError) {
        console.error('Error deducting promo balance:', deductError);
        throw new Error('Failed to apply promo balance');
      }

      // Create completed entry record
      const { error: entryError } = await supabaseAdmin
        .from("round_entries")
        .insert({
          round_id: round.id,
          user_id: user.id,
          amount_paid: entryFeePence,
          promo_used: promoToUse,
          status: "completed",
          paid_at: new Date().toISOString(),
        });

      if (entryError) {
        console.error("Error creating entry:", entryError);
        throw new Error("Failed to create entry");
      }

      // Create picks entry
      const { data: picksData, error: picksError } = await supabaseAdmin
        .from("fantasy_round_picks")
        .insert({
          round_id: round.id,
          user_id: user.id,
          team_picks: [],
        })
        .select()
        .single();

      if (picksError) {
        console.error("Error creating picks entry:", picksError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          promo_covered: true,
          promo_used: promoToUse,
          message: "Entry completed using promo balance"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists for this user
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = newCustomer.id;
    }

    // Create checkout session - use configured price_id or dynamic pricing
    const siteUrl = Deno.env.get("SITE_URL") || "https://fragsandfortunes.com";
    
    // Build line items - always use dynamic pricing when promo is involved
    const lineItems = (round.stripe_price_id && promoToUse === 0)
      ? [
          {
            price: round.stripe_price_id,
            quantity: 1,
          },
        ]
      : [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: `Fantasy Round Entry: ${round.round_name || round.type}`,
                description: promoToUse > 0
                  ? `Entry fee £${(entryFeePence / 100).toFixed(2)} - Promo £${(promoToUse / 100).toFixed(2)} = £${(stripeAmount / 100).toFixed(2)}`
                  : `Entry to the ${round.type} fantasy round (${new Date(round.start_date).toLocaleDateString()} - ${new Date(round.end_date).toLocaleDateString()})`,
              },
              unit_amount: stripeAmount,
            },
            quantity: 1,
          },
        ];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      metadata: {
        round_id: round.id,
        user_id: user.id,
        type: "round_entry",
        promo_used: promoToUse.toString(),
        original_fee: entryFeePence.toString(),
      },
      success_url: `${siteUrl}/fantasy/entry/success?session_id={CHECKOUT_SESSION_ID}&round_id=${round.id}`,
      cancel_url: `${siteUrl}/fantasy`,
    });

    console.log(`Checkout session created: ${session.id}`);

    // Create pending entry record
    const { error: entryError } = await supabaseAdmin
      .from("round_entries")
      .insert({
        round_id: round.id,
        user_id: user.id,
        stripe_session_id: session.id,
        amount_paid: entryFeePence,
        promo_used: promoToUse,
        status: "pending",
      });

    if (entryError) {
      console.error("Error creating pending entry:", entryError);
      // Don't throw - the payment can still proceed
    }

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        session_id: session.id,
        promo_used: promoToUse,
        stripe_amount: stripeAmount,
        original_fee: entryFeePence
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});