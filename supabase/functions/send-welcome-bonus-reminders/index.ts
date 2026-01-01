import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserProfile {
  id: string;
  username: string;
  promo_balance_pence: number;
  promo_expires_at: string;
  created_at: string;
  welcome_offer_tier: number;
  welcome_offer_claimed: boolean;
}

// ============= TIER 1 FREE ENTRY EMAILS (not yet claimed) =============

const getTier1Day2EmailHtml = (username: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #ffffff; font-size: 28px; margin: 0;">🎮 Frags & Fortunes</h1>
    </div>
    
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; border: 1px solid rgba(139, 92, 246, 0.3);">
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">Hey ${username}! 👋</h2>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        You've got a <strong style="color: #22c55e;">FREE paid round entry</strong> waiting to be claimed! 
        No payment needed - it's completely on us.
      </p>
      
      <div style="background: rgba(34, 197, 94, 0.15); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(34, 197, 94, 0.3);">
        <div style="text-align: center;">
          <span style="color: #22c55e; font-size: 36px; font-weight: bold;">🎁 FREE ENTRY</span>
          <p style="color: #a0a0b0; margin: 8px 0 0 0; font-size: 14px;">Worth $5 - claim it now!</p>
        </div>
      </div>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        <strong style="color: #ffffff;">Here's how it works:</strong>
      </p>
      
      <ul style="color: #a0a0b0; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0 0 20px 0;">
        <li>✅ Click "Claim Free Entry" on your next paid round</li>
        <li>🎯 Pick your favorite esports teams</li>
        <li>🏆 Compete for real prizes - no risk!</li>
        <li>🎁 Unlock the Spend $5 Get $10 bonus after!</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="https://fragsandfortunes.com/fantasy" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Claim My Free Entry 🎯
        </a>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        You're receiving this because you signed up for Frags & Fortunes.<br>
        <a href="https://fragsandfortunes.com" style="color: #8B5CF6;">fragsandfortunes.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

const getTier1Day5EmailHtml = (username: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #ffffff; font-size: 28px; margin: 0;">🎮 Frags & Fortunes</h1>
    </div>
    
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; border: 1px solid rgba(255, 107, 107, 0.3);">
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">⚠️ Your Free Entry is Expiring, ${username}!</h2>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Your <strong style="color: #ff6b6b;">100% FREE paid round entry</strong> is still unclaimed! 
        Don't let this opportunity slip away.
      </p>
      
      <div style="background: rgba(255, 107, 107, 0.15); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(255, 107, 107, 0.3);">
        <div style="text-align: center;">
          <span style="color: #ff6b6b; font-size: 36px; font-weight: bold;">⏰ EXPIRES SOON</span>
          <p style="color: #a0a0b0; margin: 8px 0 0 0; font-size: 14px;">$5 free entry - claim before it's gone!</p>
        </div>
      </div>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong style="color: #ffffff;">What you're missing:</strong>
      </p>
      
      <ul style="color: #a0a0b0; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0 0 20px 0;">
        <li>🏆 Compete for real prizes at no cost</li>
        <li>⭐ Pick your Star Team for double points</li>
        <li>🎮 Cover CS2, Valorant, LoL, and Dota 2</li>
        <li>🎁 Unlock the Spend $5 Get $10 bonus!</li>
      </ul>
      
      <p style="color: #ff6b6b; font-size: 14px; margin: 0 0 24px 0; font-weight: 600;">
        🔥 This is a limited-time offer - claim it now!
      </p>
      
      <div style="text-align: center;">
        <a href="https://fragsandfortunes.com/fantasy" style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Claim Free Entry Now 🚀
        </a>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        You're receiving this because you signed up for Frags & Fortunes.<br>
        <a href="https://fragsandfortunes.com" style="color: #8B5CF6;">fragsandfortunes.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// ============= TIER 2 SPEND $5 GET $10 EMAILS (unlocked but not completed) =============

const getTier2Day2EmailHtml = (username: string, spentSoFar: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #ffffff; font-size: 28px; margin: 0;">🎮 Frags & Fortunes</h1>
    </div>
    
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; border: 1px solid rgba(139, 92, 246, 0.3);">
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">Congratulations ${username}! 🎉</h2>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        You've unlocked the exclusive <strong style="color: #8B5CF6;">Spend $5 Get $10</strong> bonus offer!
      </p>
      
      <div style="background: rgba(139, 92, 246, 0.15); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(139, 92, 246, 0.3);">
        <div style="text-align: center;">
          <span style="color: #8B5CF6; font-size: 32px; font-weight: bold;">SPEND $5 → GET $10</span>
          <p style="color: #a0a0b0; margin: 8px 0 0 0; font-size: 14px;">You've spent: $${spentSoFar} / $5.00</p>
        </div>
      </div>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        <strong style="color: #ffffff;">Here's the deal:</strong> Enter any paid rounds totaling $5, 
        and we'll credit your account with <strong style="color: #22c55e;">$10 in promo balance</strong>!
      </p>
      
      <ul style="color: #a0a0b0; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0 0 20px 0;">
        <li>💰 Spend $5 on paid round entries</li>
        <li>🎁 Get $10 credited automatically</li>
        <li>🏆 Use it to enter more rounds for free!</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="https://fragsandfortunes.com/fantasy" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #7c3aed 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View Paid Rounds 💎
        </a>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        You're receiving this because you signed up for Frags & Fortunes.<br>
        <a href="https://fragsandfortunes.com" style="color: #8B5CF6;">fragsandfortunes.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

const getTier2Day5EmailHtml = (username: string, spentSoFar: string, remaining: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #ffffff; font-size: 28px; margin: 0;">🎮 Frags & Fortunes</h1>
    </div>
    
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; border: 1px solid rgba(255, 107, 107, 0.3);">
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">⏰ Don't Miss Your $10 Bonus, ${username}!</h2>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        You're so close to unlocking <strong style="color: #22c55e;">$10 in promo balance</strong>!
      </p>
      
      <div style="background: rgba(255, 107, 107, 0.15); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(255, 107, 107, 0.3);">
        <div style="text-align: center;">
          <span style="color: #ff6b6b; font-size: 28px; font-weight: bold;">JUST $${remaining} MORE!</span>
          <p style="color: #a0a0b0; margin: 8px 0 0 0; font-size: 14px;">Progress: $${spentSoFar} / $5.00 spent</p>
        </div>
      </div>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong style="color: #ffffff;">Complete your spending to get:</strong>
      </p>
      
      <ul style="color: #a0a0b0; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0 0 20px 0;">
        <li>💰 $10 promo balance (that's 2x your spend!)</li>
        <li>🏆 More paid round entries at no extra cost</li>
        <li>🎮 More chances to win real prizes</li>
      </ul>
      
      <p style="color: #ff6b6b; font-size: 14px; margin: 0 0 24px 0; font-weight: 600;">
        🔥 This offer is time-limited - complete it before it expires!
      </p>
      
      <div style="text-align: center;">
        <a href="https://fragsandfortunes.com/fantasy" style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Complete My Bonus 🚀
        </a>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        You're receiving this because you signed up for Frags & Fortunes.<br>
        <a href="https://fragsandfortunes.com" style="color: #8B5CF6;">fragsandfortunes.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// ============= PROMO BALANCE EMAILS (claimed but not used) =============

const getPromoBalanceDay2EmailHtml = (username: string, balancePounds: string, expiresDate: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #ffffff; font-size: 28px; margin: 0;">🎮 Frags & Fortunes</h1>
    </div>
    
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; border: 1px solid rgba(139, 92, 246, 0.3);">
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">Hey ${username}! 👋</h2>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Just a friendly reminder - you've got <strong style="color: #22c55e;">$${balancePounds} promo balance</strong> waiting to be used!
      </p>
      
      <div style="background: rgba(34, 197, 94, 0.15); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(34, 197, 94, 0.3);">
        <div style="text-align: center;">
          <span style="color: #22c55e; font-size: 36px; font-weight: bold;">$${balancePounds}</span>
          <p style="color: #a0a0b0; margin: 8px 0 0 0; font-size: 14px;">Promo balance ready to use</p>
        </div>
      </div>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Use it to enter paid fantasy rounds and compete for real prizes! Pick your favorite CS2, Valorant, League of Legends, or Dota 2 teams.
      </p>
      
      <p style="color: #ff6b6b; font-size: 14px; margin: 0 0 24px 0;">
        ⏰ Your promo balance expires on <strong>${expiresDate}</strong> - don't miss out!
      </p>
      
      <div style="text-align: center;">
        <a href="https://fragsandfortunes.com/fantasy" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Use My Balance 🎯
        </a>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        You're receiving this because you signed up for Frags & Fortunes.<br>
        <a href="https://fragsandfortunes.com" style="color: #8B5CF6;">fragsandfortunes.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

const getPromoBalanceDay5EmailHtml = (username: string, balancePounds: string, expiresDate: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #ffffff; font-size: 28px; margin: 0;">🎮 Frags & Fortunes</h1>
    </div>
    
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; border: 1px solid rgba(255, 107, 107, 0.3);">
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">⚠️ Don't Miss Out, ${username}!</h2>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Your <strong style="color: #ff6b6b;">$${balancePounds} promo balance</strong> is still unused! Time is running out.
      </p>
      
      <div style="background: rgba(255, 107, 107, 0.15); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(255, 107, 107, 0.3);">
        <div style="text-align: center;">
          <span style="color: #ff6b6b; font-size: 36px; font-weight: bold;">$${balancePounds}</span>
          <p style="color: #a0a0b0; margin: 8px 0 0 0; font-size: 14px;">Waiting to be used!</p>
        </div>
      </div>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong style="color: #ffffff;">Use your promo balance to:</strong>
      </p>
      
      <ul style="color: #a0a0b0; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0 0 20px 0;">
        <li>🏆 Compete against other players for prizes</li>
        <li>⭐ Pick your Star Team for double points</li>
        <li>🎮 Cover CS2, Valorant, LoL, and Dota 2</li>
      </ul>
      
      <p style="color: #ff6b6b; font-size: 14px; margin: 0 0 24px 0; font-weight: 600;">
        🔥 Expires ${expiresDate} - Use it or lose it!
      </p>
      
      <div style="text-align: center;">
        <a href="https://fragsandfortunes.com/fantasy" style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Use My Balance Now 🚀
        </a>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
      <p style="color: #666; font-size: 12px; margin: 0;">
        You're receiving this because you signed up for Frags & Fortunes.<br>
        <a href="https://fragsandfortunes.com" style="color: #8B5CF6;">fragsandfortunes.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// Helper to check if reminder already sent
async function hasReminderBeenSent(
  supabase: any,
  userId: string,
  reminderDay: number,
  reminderType: string
): Promise<boolean> {
  const { data } = await supabase
    .from("welcome_bonus_reminders")
    .select("id")
    .eq("user_id", userId)
    .eq("reminder_day", reminderDay)
    .eq("reminder_type", reminderType)
    .single();
  
  return !!data;
}

// Helper to record reminder sent
async function recordReminderSent(
  supabase: any,
  userId: string,
  reminderDay: number,
  reminderType: string
): Promise<void> {
  await supabase.from("welcome_bonus_reminders").insert({
    user_id: userId,
    reminder_day: reminderDay,
    reminder_type: reminderType
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting welcome bonus reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    
    // Calculate date ranges for day 2 and day 5
    const day2Start = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const day2End = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const day5Start = new Date(now.getTime() - 120 * 60 * 60 * 1000);
    const day5End = new Date(now.getTime() - 96 * 60 * 60 * 1000);

    console.log(`Day 2 range: ${day2Start.toISOString()} to ${day2End.toISOString()}`);
    console.log(`Day 5 range: ${day5Start.toISOString()} to ${day5End.toISOString()}`);

    let emailsSent = 0;
    const errors: string[] = [];
    const stats = {
      tier1Day2: 0,
      tier1Day5: 0,
      tier2Day2: 0,
      tier2Day5: 0,
      promoDay2: 0,
      promoDay5: 0
    };

    // ============= TIER 1: Free Entry Not Claimed =============
    // Users who haven't claimed their free entry yet
    const { data: tier1Day2Users } = await supabase
      .from("profiles")
      .select("id, username, created_at, welcome_offer_tier, welcome_offer_claimed")
      .eq("welcome_offer_tier", 1)
      .eq("welcome_offer_claimed", false)
      .gte("created_at", day2Start.toISOString())
      .lt("created_at", day2End.toISOString());

    const { data: tier1Day5Users } = await supabase
      .from("profiles")
      .select("id, username, created_at, welcome_offer_tier, welcome_offer_claimed")
      .eq("welcome_offer_tier", 1)
      .eq("welcome_offer_claimed", false)
      .gte("created_at", day5Start.toISOString())
      .lt("created_at", day5End.toISOString());

    console.log(`Tier 1 candidates: Day 2=${tier1Day2Users?.length || 0}, Day 5=${tier1Day5Users?.length || 0}`);

    // Process Tier 1 Day 2
    for (const user of tier1Day2Users || []) {
      try {
        if (await hasReminderBeenSent(supabase, user.id, 2, "tier1_free_entry")) continue;

        const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
        if (!authUser?.user?.email) continue;

        const result = await resend.emails.send({
          from: "Frags & Fortunes <noreply@fragsandfortunes.com>",
          to: [authUser.user.email],
          subject: `🎁 ${user.username}, your FREE paid entry is waiting!`,
          html: getTier1Day2EmailHtml(user.username || "Player"),
        });

        if (!result.error) {
          await recordReminderSent(supabase, user.id, 2, "tier1_free_entry");
          emailsSent++;
          stats.tier1Day2++;
          console.log(`Tier 1 Day 2 email sent to ${authUser.user.email}`);
        }
      } catch (err: any) {
        errors.push(`Tier1 Day2 ${user.id}: ${err.message}`);
      }
    }

    // Process Tier 1 Day 5
    for (const user of tier1Day5Users || []) {
      try {
        if (await hasReminderBeenSent(supabase, user.id, 5, "tier1_free_entry")) continue;

        const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
        if (!authUser?.user?.email) continue;

        const result = await resend.emails.send({
          from: "Frags & Fortunes <noreply@fragsandfortunes.com>",
          to: [authUser.user.email],
          subject: `⚠️ Last chance ${user.username}! Your FREE entry expires soon`,
          html: getTier1Day5EmailHtml(user.username || "Player"),
        });

        if (!result.error) {
          await recordReminderSent(supabase, user.id, 5, "tier1_free_entry");
          emailsSent++;
          stats.tier1Day5++;
          console.log(`Tier 1 Day 5 email sent to ${authUser.user.email}`);
        }
      } catch (err: any) {
        errors.push(`Tier1 Day5 ${user.id}: ${err.message}`);
      }
    }

    // ============= TIER 2: Spend $5 Get $10 Not Completed =============
    // Users on tier 2 who haven't completed the spending threshold
    const { data: tier2Day2Users } = await supabase
      .from("profiles")
      .select("id, username, created_at, welcome_offer_tier, welcome_offer_claimed, welcome_offer_spend_pence")
      .eq("welcome_offer_tier", 2)
      .eq("welcome_offer_claimed", false)
      .gte("created_at", day2Start.toISOString())
      .lt("created_at", day2End.toISOString());

    const { data: tier2Day5Users } = await supabase
      .from("profiles")
      .select("id, username, created_at, welcome_offer_tier, welcome_offer_claimed, welcome_offer_spend_pence")
      .eq("welcome_offer_tier", 2)
      .eq("welcome_offer_claimed", false)
      .gte("created_at", day5Start.toISOString())
      .lt("created_at", day5End.toISOString());

    console.log(`Tier 2 candidates: Day 2=${tier2Day2Users?.length || 0}, Day 5=${tier2Day5Users?.length || 0}`);

    // Process Tier 2 Day 2
    for (const user of tier2Day2Users || []) {
      try {
        if (await hasReminderBeenSent(supabase, user.id, 2, "tier2_spend_bonus")) continue;

        const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
        if (!authUser?.user?.email) continue;

        const spentSoFar = ((user.welcome_offer_spend_pence || 0) / 100).toFixed(2);

        const result = await resend.emails.send({
          from: "Frags & Fortunes <noreply@fragsandfortunes.com>",
          to: [authUser.user.email],
          subject: `💰 ${user.username}, Spend $5 Get $10 - Your exclusive offer!`,
          html: getTier2Day2EmailHtml(user.username || "Player", spentSoFar),
        });

        if (!result.error) {
          await recordReminderSent(supabase, user.id, 2, "tier2_spend_bonus");
          emailsSent++;
          stats.tier2Day2++;
          console.log(`Tier 2 Day 2 email sent to ${authUser.user.email}`);
        }
      } catch (err: any) {
        errors.push(`Tier2 Day2 ${user.id}: ${err.message}`);
      }
    }

    // Process Tier 2 Day 5
    for (const user of tier2Day5Users || []) {
      try {
        if (await hasReminderBeenSent(supabase, user.id, 5, "tier2_spend_bonus")) continue;

        const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
        if (!authUser?.user?.email) continue;

        const spentPence = user.welcome_offer_spend_pence || 0;
        const spentSoFar = (spentPence / 100).toFixed(2);
        const remaining = Math.max(0, (500 - spentPence) / 100).toFixed(2);

        const result = await resend.emails.send({
          from: "Frags & Fortunes <noreply@fragsandfortunes.com>",
          to: [authUser.user.email],
          subject: `⏰ ${user.username}, just $${remaining} more to unlock $10!`,
          html: getTier2Day5EmailHtml(user.username || "Player", spentSoFar, remaining),
        });

        if (!result.error) {
          await recordReminderSent(supabase, user.id, 5, "tier2_spend_bonus");
          emailsSent++;
          stats.tier2Day5++;
          console.log(`Tier 2 Day 5 email sent to ${authUser.user.email}`);
        }
      } catch (err: any) {
        errors.push(`Tier2 Day5 ${user.id}: ${err.message}`);
      }
    }

    // ============= PROMO BALANCE: Claimed But Not Used =============
    // Users who have promo balance but haven't used it
    const { data: promoDay2Users } = await supabase
      .from("profiles")
      .select("id, username, promo_balance_pence, promo_expires_at, created_at")
      .gt("promo_balance_pence", 0)
      .gte("created_at", day2Start.toISOString())
      .lt("created_at", day2End.toISOString());

    const { data: promoDay5Users } = await supabase
      .from("profiles")
      .select("id, username, promo_balance_pence, promo_expires_at, created_at")
      .gt("promo_balance_pence", 0)
      .gte("created_at", day5Start.toISOString())
      .lt("created_at", day5End.toISOString());

    console.log(`Promo balance candidates: Day 2=${promoDay2Users?.length || 0}, Day 5=${promoDay5Users?.length || 0}`);

    // Process Promo Balance Day 2
    for (const user of promoDay2Users || []) {
      try {
        if (await hasReminderBeenSent(supabase, user.id, 2, "promo_balance")) continue;

        const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
        if (!authUser?.user?.email) continue;

        const balancePounds = (user.promo_balance_pence / 100).toFixed(2);
        const expiresDate = new Date(user.promo_expires_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

        const result = await resend.emails.send({
          from: "Frags & Fortunes <noreply@fragsandfortunes.com>",
          to: [authUser.user.email],
          subject: `🎮 ${user.username}, your $${balancePounds} promo balance is waiting!`,
          html: getPromoBalanceDay2EmailHtml(user.username || "Player", balancePounds, expiresDate),
        });

        if (!result.error) {
          await recordReminderSent(supabase, user.id, 2, "promo_balance");
          emailsSent++;
          stats.promoDay2++;
          console.log(`Promo Day 2 email sent to ${authUser.user.email}`);
        }
      } catch (err: any) {
        errors.push(`Promo Day2 ${user.id}: ${err.message}`);
      }
    }

    // Process Promo Balance Day 5
    for (const user of promoDay5Users || []) {
      try {
        if (await hasReminderBeenSent(supabase, user.id, 5, "promo_balance")) continue;

        const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
        if (!authUser?.user?.email) continue;

        const balancePounds = (user.promo_balance_pence / 100).toFixed(2);
        const expiresDate = new Date(user.promo_expires_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

        const result = await resend.emails.send({
          from: "Frags & Fortunes <noreply@fragsandfortunes.com>",
          to: [authUser.user.email],
          subject: `⚠️ Last chance ${user.username}! Your $${balancePounds} expires soon`,
          html: getPromoBalanceDay5EmailHtml(user.username || "Player", balancePounds, expiresDate),
        });

        if (!result.error) {
          await recordReminderSent(supabase, user.id, 5, "promo_balance");
          emailsSent++;
          stats.promoDay5++;
          console.log(`Promo Day 5 email sent to ${authUser.user.email}`);
        }
      } catch (err: any) {
        errors.push(`Promo Day5 ${user.id}: ${err.message}`);
      }
    }

    const result = {
      success: true,
      emailsSent,
      stats,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString()
    };

    console.log("Reminder check complete:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-bonus-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
