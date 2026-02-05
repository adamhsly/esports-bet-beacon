 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
 import { createHmac } from "https://deno.land/std@0.190.0/crypto/mod.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cc-webhook-signature",
 };
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const webhookSecret = Deno.env.get("COINBASE_WEBHOOK_SECRET");
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 
     const body = await req.text();
     const signature = req.headers.get("x-cc-webhook-signature");
 
     // Verify webhook signature if secret is configured
     if (webhookSecret && signature) {
       const encoder = new TextEncoder();
       const key = await crypto.subtle.importKey(
         "raw",
         encoder.encode(webhookSecret),
         { name: "HMAC", hash: "SHA-256" },
         false,
         ["sign"]
       );
       const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
       const computedSignature = Array.from(new Uint8Array(signatureBytes))
         .map(b => b.toString(16).padStart(2, "0"))
         .join("");
       
       if (computedSignature !== signature) {
         console.error("Invalid webhook signature");
         return new Response(JSON.stringify({ error: "Invalid signature" }), {
           status: 401,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
     }
 
     const event = JSON.parse(body);
     console.log("Coinbase webhook event:", event.event?.type);
 
     const eventType = event.event?.type;
     const charge = event.event?.data;
 
     if (!charge) {
       console.log("No charge data in event");
       return new Response(JSON.stringify({ received: true }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
     const chargeId = charge.id;
     const metadata = charge.metadata || {};
     const roundId = metadata.round_id;
     const userId = metadata.user_id;
     const promoUsed = parseInt(metadata.promo_used || "0", 10);
     const originalFee = parseInt(metadata.original_fee || "0", 10);
 
     console.log(`Processing charge ${chargeId} for round ${roundId}, user ${userId}`);
 
     // Handle different event types
     if (eventType === "charge:confirmed" || eventType === "charge:resolved") {
       console.log("Payment confirmed - completing entry");
 
       // Find the pending entry
       const { data: entry, error: entryError } = await supabaseAdmin
         .from("round_entries")
         .select("id, status, pick_id")
         .eq("stripe_session_id", `coinbase_${chargeId}`)
         .single();
 
       if (entryError || !entry) {
         console.error("Entry not found for charge:", chargeId);
         return new Response(JSON.stringify({ error: "Entry not found" }), {
           status: 404,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
 
       if (entry.status === "completed") {
         console.log("Entry already completed");
         return new Response(JSON.stringify({ received: true, already_completed: true }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
       }
 
       // Create picks entry if needed
       let pickId = entry.pick_id;
       if (!pickId) {
         const { data: picksData, error: picksError } = await supabaseAdmin
           .from("fantasy_round_picks")
           .insert({
             round_id: roundId,
             user_id: userId,
             team_picks: [],
           })
           .select()
           .single();
 
         if (picksError) {
           console.error("Error creating picks entry:", picksError);
         } else {
           pickId = picksData.id;
         }
       }
 
       // Update entry to completed
       const { error: updateError } = await supabaseAdmin
         .from("round_entries")
         .update({
           status: "completed",
           paid_at: new Date().toISOString(),
           pick_id: pickId,
         })
         .eq("id", entry.id);
 
       if (updateError) {
         console.error("Error updating entry:", updateError);
         throw new Error("Failed to update entry");
       }
 
       // Deduct promo balance if used
       if (promoUsed > 0) {
         const { data: profile } = await supabaseAdmin
           .from("profiles")
           .select("promo_balance_pence")
           .eq("id", userId)
           .single();
 
         if (profile) {
           const newBalance = Math.max(0, (profile.promo_balance_pence || 0) - promoUsed);
           await supabaseAdmin
             .from("profiles")
             .update({ promo_balance_pence: newBalance })
             .eq("id", userId);
           console.log(`Deducted ${promoUsed} pence from promo balance`);
         }
       }
 
       // Track affiliate activation
       try {
         const { data: profile } = await supabaseAdmin
           .from("profiles")
           .select("referrer_code")
           .eq("id", userId)
           .single();
 
         if (profile?.referrer_code) {
           const { data: affiliate } = await supabaseAdmin
             .from("creator_affiliates")
             .select("id, compensation_type, pay_per_play_rate, rev_share_percent")
             .eq("referral_code", profile.referrer_code)
             .eq("status", "active")
             .single();
 
           if (affiliate) {
             if (affiliate.compensation_type === "pay_per_play") {
               const { data: existingActivation } = await supabaseAdmin
                 .from("affiliate_activations")
                 .select("id, activated")
                 .eq("creator_id", affiliate.id)
                 .eq("user_id", userId)
                 .maybeSingle();
 
               if (!existingActivation) {
                 const payoutAmount = affiliate.pay_per_play_rate || 50;
                 await supabaseAdmin.from("affiliate_activations").insert({
                   creator_id: affiliate.id,
                   user_id: userId,
                   registered_at: new Date().toISOString(),
                   first_round_played_at: new Date().toISOString(),
                   round_id: roundId,
                   activated: true,
                   payout_amount: payoutAmount,
                 });
                 console.log(`Pay-per-play activation created for affiliate ${affiliate.id}`);
               }
             } else if (affiliate.compensation_type === "rev_share" && originalFee > 0) {
               const revSharePercent = affiliate.rev_share_percent || 10;
               const earningsAmount = Math.floor(originalFee * (revSharePercent / 100));
 
               await supabaseAdmin.from("affiliate_earnings").insert({
                 creator_id: affiliate.id,
                 user_id: userId,
                 round_id: roundId,
                 entry_fee: originalFee,
                 rev_share_percent: revSharePercent,
                 earnings_amount: earningsAmount,
               });
               console.log(`Rev-share earning ${earningsAmount} pence created for affiliate ${affiliate.id}`);
             }
           }
         }
       } catch (affiliateError) {
         console.error("Affiliate tracking failed (non-blocking):", affiliateError);
       }
 
       console.log("Payment confirmed and entry completed successfully");
     } else if (eventType === "charge:failed" || eventType === "charge:expired") {
       console.log("Payment failed or expired - marking entry as failed");
 
       await supabaseAdmin
         .from("round_entries")
         .update({ status: "failed" })
         .eq("stripe_session_id", `coinbase_${chargeId}`);
     } else {
       console.log(`Unhandled event type: ${eventType}`);
     }
 
     return new Response(JSON.stringify({ received: true }), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   } catch (error) {
     console.error("Webhook error:", error);
     return new Response(JSON.stringify({ error: error.message }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });