import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing stripe webhook');

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecretKey || !webhookSecret) {
      console.error('Missing required environment variables');
      throw new Error('Missing required environment variables');
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get the body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('No stripe signature found');
      throw new Error('No stripe signature found');
    }

    // Verify the webhook signature using async version (required for Deno/Edge Functions)
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      console.log('Webhook signature verified for event:', event.type);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    // Create Supabase client with service role key to bypass RLS
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      console.log('Checkout completed, metadata:', metadata);

      // Check if this is a round entry payment
      if (metadata.type === 'round_entry' && metadata.round_id && metadata.user_id) {
        console.log(`Processing round entry: round=${metadata.round_id}, user=${metadata.user_id}`);

        // Update the round entry record
        const { data: entryData, error: updateEntryError } = await supabaseService
          .from('round_entries')
          .update({
            status: 'completed',
            stripe_payment_intent_id: session.payment_intent as string,
            paid_at: new Date().toISOString(),
          })
          .eq('stripe_session_id', session.id)
          .select()
          .single();

        if (updateEntryError) {
          console.error('Error updating entry:', updateEntryError);
          // Try to create the entry if it doesn't exist
          const { error: createError } = await supabaseService
            .from('round_entries')
            .insert({
              round_id: metadata.round_id,
              user_id: metadata.user_id,
              stripe_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent as string,
              amount_paid: session.amount_total || 0,
              status: 'completed',
              paid_at: new Date().toISOString(),
            });

          if (createError) {
            console.error('Error creating entry:', createError);
            throw new Error('Failed to record payment');
          }
        }

        // Create a new picks entry for this paid entry
        const { data: picksData, error: picksError } = await supabaseService
          .from('fantasy_round_picks')
          .insert({
            round_id: metadata.round_id,
            user_id: metadata.user_id,
            team_picks: [],
          })
          .select()
          .single();

        if (picksError) {
          console.error('Error creating picks entry:', picksError);
        } else {
          // Link the picks to the entry
          await supabaseService
            .from('round_entries')
            .update({ pick_id: picksData.id })
            .eq('stripe_session_id', session.id);

          console.log(`Created picks entry: ${picksData.id}`);
        }

        // Track affiliate earnings if user was referred
        const entryFee = session.amount_total || 0;
        if (entryFee > 0) {
          try {
            // Get user's referrer code
            const { data: userProfile } = await supabaseService
              .from('profiles')
              .select('referrer_code')
              .eq('id', metadata.user_id)
              .single();

            if (userProfile?.referrer_code) {
              console.log(`User ${metadata.user_id} has referrer: ${userProfile.referrer_code}`);
              
              // Find the affiliate by referral code
              const { data: affiliate } = await supabaseService
                .from('creator_affiliates')
                .select('id, rev_share_percent')
                .eq('referral_code', userProfile.referrer_code)
                .eq('status', 'active')
                .single();

              if (affiliate) {
                const revSharePercent = affiliate.rev_share_percent || 20;
                const earningsAmount = Math.floor(entryFee * (revSharePercent / 100));

                console.log(`Logging affiliate earning: creator=${affiliate.id}, fee=${entryFee}, share=${revSharePercent}%, amount=${earningsAmount}`);

                const { error: earningsError } = await supabaseService
                  .from('affiliate_earnings')
                  .insert({
                    creator_id: affiliate.id,
                    user_id: metadata.user_id,
                    round_id: metadata.round_id,
                    entry_fee: entryFee,
                    rev_share_percent: revSharePercent,
                    earnings_amount: earningsAmount,
                  });

                if (earningsError) {
                  console.error('Error logging affiliate earnings:', earningsError);
                } else {
                  console.log(`Affiliate earnings logged successfully`);
                }
              }
            }
          } catch (affiliateErr) {
            console.error('Error processing affiliate tracking:', affiliateErr);
          }
        }

        console.log(`Round entry completed successfully for user ${metadata.user_id}`);
      }
      // Handle premium pass purchase (existing functionality)
      else if (metadata.user_id) {
        const userId = metadata.user_id;
        console.log('Processing successful payment for user:', userId);

        // Update user's premium status
        const { error: updateError } = await supabaseService
          .from('profiles')
          .update({ premium_pass: true })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating user premium status:', updateError);
          throw new Error(`Error updating user premium status: ${updateError.message}`);
        }

        console.log('Successfully updated premium status for user:', userId);

        // Optional: Create receipt record
        const { error: receiptError } = await supabaseService
          .from('premium_receipts')
          .insert({
            user_id: userId,
            amount_total: session.amount_total,
            currency: session.currency,
            stripe_session_id: session.id,
            created_at: new Date().toISOString(),
          });

        if (receiptError) {
          console.warn('Error creating receipt record:', receiptError);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
