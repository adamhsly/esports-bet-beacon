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

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('Webhook signature verified for event:', event.type);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;

      if (!userId) {
        console.error('No user_id found in session metadata');
        throw new Error('No user_id found in session metadata');
      }

      console.log('Processing successful payment for user:', userId);

      // Create Supabase client with service role key to bypass RLS
      const supabaseService = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
      );

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
        // Don't throw here as premium status was already updated
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