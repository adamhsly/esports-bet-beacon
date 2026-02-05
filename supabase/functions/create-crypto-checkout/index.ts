 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const coinbaseApiKey = Deno.env.get("COINBASE_COMMERCE_API_KEY");
     if (!coinbaseApiKey) {
       throw new Error("COINBASE_COMMERCE_API_KEY not configured");
     }
 
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 
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
 
     const { round_id, team_picks, bench_team, star_team_id } = await req.json();
     if (!round_id) {
       throw new Error("round_id is required");
     }
 
     console.log(`Creating crypto checkout for user ${user.id}, round ${round_id}`);
 
     const { data: round, error: roundError } = await supabase
       .from("fantasy_rounds")
       .select("id, entry_fee, is_paid, status, type, round_name, start_date, end_date")
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
 
     const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
 
     // Get user's promo balance
     const { data: promoStatus } = await supabaseAdmin
       .rpc('get_welcome_offer_status', { p_user_id: user.id });
 
     let promoBalancePence = promoStatus?.promo_balance_pence || 0;
     const entryFeePence = round.entry_fee;
     const tier = promoStatus?.tier || 1;
     const offerClaimed = promoStatus?.offer_claimed ?? false;
     const rewardPence = promoStatus?.reward_pence || 0;
 
     console.log(`User promo status: tier=${tier}, claimed=${offerClaimed}, balance=${promoBalancePence}, reward=${rewardPence}`);
 
     // Check if user has EVER used a promo-covered entry
     const { data: previousPromoEntries, error: promoEntriesError } = await supabaseAdmin
       .from('round_entries')
       .select('id')
       .eq('user_id', user.id)
       .gt('promo_used', 0)
       .eq('status', 'completed')
       .limit(1);
 
     const hasUsedPromoEntry = !promoEntriesError && previousPromoEntries && previousPromoEntries.length > 0;
     
     console.log(`User has previously used promo entry: ${hasUsedPromoEntry}`);
 
     if (hasUsedPromoEntry) {
       console.log(`User has already used a promo entry - no auto-claim will occur`);
     } else if (tier === 1 && !offerClaimed && promoBalancePence === 0 && rewardPence > 0) {
       console.log(`Auto-claiming tier 1 free entry: ${rewardPence} pence`);
       
       const expiresAt = new Date();
       expiresAt.setDate(expiresAt.getDate() + 30);
       
       const { error: claimError } = await supabaseAdmin
         .from('profiles')
         .update({
           promo_balance_pence: rewardPence,
           promo_expires_at: expiresAt.toISOString(),
           welcome_offer_claimed: true,
         })
         .eq('id', user.id);
       
       if (claimError) {
         console.error('Error auto-claiming welcome offer:', claimError);
       } else {
         promoBalancePence = rewardPence;
         console.log(`Welcome offer auto-claimed successfully, new balance: ${promoBalancePence} pence`);
       }
     }
 
     // Calculate how much promo to use
     const promoToUse = Math.min(promoBalancePence, entryFeePence);
     const cryptoAmount = entryFeePence - promoToUse;
 
     console.log(`Promo to use: ${promoToUse} pence, Crypto amount: ${cryptoAmount} pence`);
 
     // If promo covers entire entry, complete directly (same as Stripe flow)
     if (cryptoAmount === 0) {
       console.log('Promo covers entire entry - processing without payment');
 
       const promoSessionId = `promo_${crypto.randomUUID()}`;
 
       const { data: picksData, error: picksError } = await supabaseAdmin
         .from("fantasy_round_picks")
         .insert({
           round_id: round.id,
           user_id: user.id,
           team_picks: team_picks || [],
           bench_team: bench_team || null,
           submitted_at: team_picks && team_picks.length > 0 ? new Date().toISOString() : null,
         })
         .select()
         .single();
 
       if (picksError) {
         console.error("Error creating picks entry:", picksError);
         throw new Error("Failed to create picks entry");
       }
 
       if (star_team_id && team_picks && team_picks.length > 0) {
         const { error: starError } = await supabaseAdmin
           .from("fantasy_round_star_teams")
           .upsert({
             round_id: round.id,
             user_id: user.id,
             star_team_id: star_team_id,
             change_used: false,
           }, { onConflict: 'round_id,user_id' });
 
         if (starError) {
           console.error("Error setting star team:", starError);
         }
       }
 
       const { error: entryError } = await supabaseAdmin
         .from("round_entries")
         .insert({
           round_id: round.id,
           user_id: user.id,
           stripe_session_id: promoSessionId,
           amount_paid: entryFeePence,
           promo_used: promoToUse,
           status: "completed",
           paid_at: new Date().toISOString(),
           pick_id: picksData.id,
         });
 
       if (entryError) {
         console.error("Error creating entry:", entryError);
         await supabaseAdmin.from("fantasy_round_picks").delete().eq("id", picksData.id);
         throw new Error("Failed to create entry");
       }
 
       const newBalance = promoBalancePence - promoToUse;
       
       const { error: deductError } = await supabaseAdmin
         .from('profiles')
         .update({
           promo_balance_pence: Math.max(0, newBalance),
           updated_at: new Date().toISOString()
         })
         .eq('id', user.id);
 
       if (deductError) {
         console.error('CRITICAL: Failed to deduct promo balance:', deductError);
       } else {
         console.log(`Promo entry completed: balance updated from ${promoBalancePence} to ${newBalance} pence`);
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
 
     // Create Coinbase Commerce charge
     const siteUrl = (Deno.env.get("SITE_URL") || "https://fragsandfortunes.com").replace(/\/$/, '');
     const chargeId = crypto.randomUUID();
     
     // Amount in GBP
     const amountGBP = (cryptoAmount / 100).toFixed(2);
 
     const chargePayload = {
       name: `Fantasy Round Entry: ${round.round_name || round.type}`,
       description: promoToUse > 0
         ? `Entry fee £${(entryFeePence / 100).toFixed(2)} - Promo £${(promoToUse / 100).toFixed(2)} = £${amountGBP}`
         : `Entry to the ${round.type} fantasy round`,
       pricing_type: "fixed_price",
       local_price: {
         amount: amountGBP,
         currency: "GBP"
       },
       metadata: {
         round_id: round.id,
         user_id: user.id,
         type: "round_entry",
         promo_used: promoToUse.toString(),
         original_fee: entryFeePence.toString(),
         charge_id: chargeId,
       },
       redirect_url: `${siteUrl}/fantasy?payment=success&round_id=${round.id}&provider=coinbase`,
       cancel_url: `${siteUrl}/fantasy?payment=cancelled`,
     };
 
     console.log('Creating Coinbase Commerce charge:', JSON.stringify(chargePayload));
 
     const coinbaseResponse = await fetch('https://api.commerce.coinbase.com/charges', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'X-CC-Api-Key': coinbaseApiKey,
         'X-CC-Version': '2018-03-22',
       },
       body: JSON.stringify(chargePayload),
     });
 
     if (!coinbaseResponse.ok) {
       const errorText = await coinbaseResponse.text();
       console.error('Coinbase Commerce API error:', coinbaseResponse.status, errorText);
       throw new Error(`Failed to create Coinbase charge: ${coinbaseResponse.status}`);
     }
 
     const coinbaseData = await coinbaseResponse.json();
     const charge = coinbaseData.data;
 
     console.log(`Coinbase charge created: ${charge.id}, hosted_url: ${charge.hosted_url}`);
 
     // Create pending entry record
     const { error: entryError } = await supabaseAdmin
       .from("round_entries")
       .insert({
         round_id: round.id,
         user_id: user.id,
         stripe_session_id: `coinbase_${charge.id}`,
         amount_paid: entryFeePence,
         promo_used: promoToUse,
         status: "pending",
       });
 
     if (entryError) {
       console.error("Error creating pending entry:", entryError);
     }
 
     return new Response(
       JSON.stringify({ 
         url: charge.hosted_url, 
         charge_id: charge.id,
         promo_used: promoToUse,
         crypto_amount: cryptoAmount,
         original_fee: entryFeePence
       }),
       {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 200,
       }
     );
   } catch (error) {
     console.error("Error creating crypto checkout:", error);
     return new Response(
       JSON.stringify({ error: error.message }),
       {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 400,
       }
     );
   }
 });