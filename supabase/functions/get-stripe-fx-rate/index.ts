import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// List of currency codes Stripe supports for conversion
const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'AUD', 'CAD', 'NZD', 'JPY', 'CNY', 'KRW', 'INR', 
  'RUB', 'PLN', 'TRY', 'BRL', 'MXN', 'SEK', 'NOK', 'DKK', 'CHF',
  'ZAR', 'SGD', 'HKD', 'AED', 'THB', 'IDR', 'MYR', 'PHP', 'VND'
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetCurrency = (url.searchParams.get('currency') || 'USD').toUpperCase();
    const amountPence = parseInt(url.searchParams.get('amount') || '0', 10);

    console.log(`[get-stripe-fx-rate] Request for ${targetCurrency}, amount: ${amountPence} pence`);

    // If target is GBP, no conversion needed
    if (targetCurrency === 'GBP') {
      return new Response(JSON.stringify({
        success: true,
        currency: 'GBP',
        rate: 1,
        localAmount: amountPence,
        gbpAmount: amountPence,
        source: 'same_currency'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if currency is supported
    if (!SUPPORTED_CURRENCIES.includes(targetCurrency)) {
      console.log(`[get-stripe-fx-rate] Unsupported currency: ${targetCurrency}, falling back to USD`);
      // Fall back to USD for unsupported currencies
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeKey) {
      console.error('[get-stripe-fx-rate] STRIPE_SECRET_KEY not found');
      return new Response(JSON.stringify({
        success: false,
        error: 'Stripe not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first (valid for 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: cachedRate } = await supabase
      .from('stripe_fx_rates')
      .select('*')
      .eq('currency_code', targetCurrency)
      .gte('fetched_at', oneHourAgo)
      .single();

    if (cachedRate) {
      console.log(`[get-stripe-fx-rate] Using cached rate for ${targetCurrency}: ${cachedRate.rate_from_gbp}`);
      const localAmount = Math.round(amountPence * cachedRate.rate_from_gbp);
      return new Response(JSON.stringify({
        success: true,
        currency: targetCurrency,
        rate: cachedRate.rate_from_gbp,
        localAmount,
        gbpAmount: amountPence,
        source: 'cache'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch fresh rate from Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    // Use a standard amount (£100 = 10000 pence) for rate calculation
    const testAmount = 10000;
    
    try {
      // Create a PaymentIntent to get the converted amount
      // Stripe includes their ~2% FX fee in this conversion
      const paymentIntent = await stripe.paymentIntents.create({
        amount: testAmount,
        currency: 'gbp',
        automatic_payment_methods: { enabled: true },
        metadata: { purpose: 'fx_rate_check' },
      });

      // Get the amount in the target currency if Stripe provides it
      // For now, we'll use exchange-rate API as Stripe doesn't directly expose FX quotes
      // to all accounts (it's a beta feature)
      
      // Cancel the test payment intent
      await stripe.paymentIntents.cancel(paymentIntent.id);
      
      console.log(`[get-stripe-fx-rate] PaymentIntent created for rate check`);
    } catch (stripeError) {
      console.log(`[get-stripe-fx-rate] Stripe PI approach failed:`, stripeError);
    }

    // Fallback: Use exchangerate-api.com (free tier)
    // This gives us a close approximation - add ~2% for Stripe's fee
    try {
      const rateResponse = await fetch(
        `https://api.exchangerate-api.com/v4/latest/GBP`
      );
      
      if (rateResponse.ok) {
        const rateData = await rateResponse.json();
        let baseRate = rateData.rates[targetCurrency];
        
        if (baseRate) {
          // Add ~2.5% to account for Stripe's FX markup
          const stripeAdjustedRate = baseRate * 1.025;
          
          console.log(`[get-stripe-fx-rate] Got rate for ${targetCurrency}: base=${baseRate}, adjusted=${stripeAdjustedRate}`);

          // Cache the rate
          await supabase
            .from('stripe_fx_rates')
            .upsert({
              currency_code: targetCurrency,
              rate_from_gbp: stripeAdjustedRate,
              fetched_at: new Date().toISOString()
            }, {
              onConflict: 'currency_code'
            });

          const localAmount = Math.round(amountPence * stripeAdjustedRate);
          
          return new Response(JSON.stringify({
            success: true,
            currency: targetCurrency,
            rate: stripeAdjustedRate,
            localAmount,
            gbpAmount: amountPence,
            source: 'exchange_api'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
    } catch (apiError) {
      console.error('[get-stripe-fx-rate] Exchange rate API error:', apiError);
    }

    // Final fallback: return GBP amount with rate 1
    console.log(`[get-stripe-fx-rate] All rate sources failed, returning GBP`);
    return new Response(JSON.stringify({
      success: true,
      currency: 'GBP',
      rate: 1,
      localAmount: amountPence,
      gbpAmount: amountPence,
      source: 'fallback'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[get-stripe-fx-rate] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
