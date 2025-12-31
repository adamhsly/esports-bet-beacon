import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserWithBonus {
  id: string;
  email: string;
  username: string;
  promo_balance_pence: number;
  promo_expires_at: string;
  created_at: string;
}

const getDay2EmailHtml = (username: string, balancePounds: string, expiresDate: string) => `
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
        Just a friendly reminder - you've got a <strong style="color: #22c55e;">free paid round entry</strong> waiting for you!
      </p>
      
      <div style="background: rgba(34, 197, 94, 0.15); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(34, 197, 94, 0.3);">
        <div style="text-align: center;">
          <span style="color: #22c55e; font-size: 36px; font-weight: bold;">1 FREE ENTRY</span>
          <p style="color: #a0a0b0; margin: 8px 0 0 0; font-size: 14px;">$${balancePounds} promo balance</p>
        </div>
      </div>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Use it to enter a paid fantasy round and compete for real prizes! Pick your favorite CS2, Valorant, League of Legends, or Dota 2 teams.
      </p>
      
      <p style="color: #8B5CF6; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
        🎁 Complete your free entry to unlock: Spend $5 Get $10 bonus!
      </p>
      
      <p style="color: #ff6b6b; font-size: 14px; margin: 0 0 24px 0;">
        ⏰ Your free entry expires on <strong>${expiresDate}</strong> - don't miss out!
      </p>
      
      <div style="text-align: center;">
        <a href="https://fragsandfortunes.com/fantasy" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Use My Free Entry 🎯
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

const getDay5EmailHtml = (username: string, balancePounds: string, expiresDate: string) => `
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
        Your <strong style="color: #ff6b6b;">free paid round entry</strong> is still unused! Time is running out.
      </p>
      
      <div style="background: rgba(255, 107, 107, 0.15); border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid rgba(255, 107, 107, 0.3);">
        <div style="text-align: center;">
          <span style="color: #ff6b6b; font-size: 36px; font-weight: bold;">FREE ENTRY</span>
          <p style="color: #a0a0b0; margin: 8px 0 0 0; font-size: 14px;">$${balancePounds} waiting to be used!</p>
        </div>
      </div>
      
      <p style="color: #a0a0b0; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong style="color: #ffffff;">Use your free entry to:</strong>
      </p>
      
      <ul style="color: #a0a0b0; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0 0 20px 0;">
        <li>🏆 Compete against other players for prizes</li>
        <li>⭐ Pick your Star Team for double points</li>
        <li>🎁 Unlock the Spend $5 Get $10 bonus</li>
        <li>🎮 Cover CS2, Valorant, LoL, and Dota 2</li>
      </ul>
      
      <p style="color: #ff6b6b; font-size: 14px; margin: 0 0 24px 0; font-weight: 600;">
        🔥 Expires ${expiresDate} - Use it or lose it!
      </p>
      
      <div style="text-align: center;">
        <a href="https://fragsandfortunes.com/fantasy" style="display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Use My Free Entry Now 🚀
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
    // Day 2: Users created between 24-48 hours ago
    const day2Start = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const day2End = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Day 5: Users created between 96-120 hours ago (4-5 days)
    const day5Start = new Date(now.getTime() - 120 * 60 * 60 * 1000);
    const day5End = new Date(now.getTime() - 96 * 60 * 60 * 1000);

    console.log(`Checking for day 2 users (created between ${day2Start.toISOString()} and ${day2End.toISOString()})`);
    console.log(`Checking for day 5 users (created between ${day5Start.toISOString()} and ${day5End.toISOString()})`);

    // Get users for day 2 reminder
    const { data: day2Users, error: day2Error } = await supabase
      .from("profiles")
      .select("id, username, promo_balance_pence, promo_expires_at, created_at")
      .gt("promo_balance_pence", 0)
      .gte("created_at", day2Start.toISOString())
      .lt("created_at", day2End.toISOString());

    if (day2Error) {
      console.error("Error fetching day 2 users:", day2Error);
      throw day2Error;
    }

    // Get users for day 5 reminder
    const { data: day5Users, error: day5Error } = await supabase
      .from("profiles")
      .select("id, username, promo_balance_pence, promo_expires_at, created_at")
      .gt("promo_balance_pence", 0)
      .gte("created_at", day5Start.toISOString())
      .lt("created_at", day5End.toISOString());

    if (day5Error) {
      console.error("Error fetching day 5 users:", day5Error);
      throw day5Error;
    }

    console.log(`Found ${day2Users?.length || 0} users for day 2 reminder`);
    console.log(`Found ${day5Users?.length || 0} users for day 5 reminder`);

    let emailsSent = 0;
    let errors: string[] = [];

    // Process day 2 users
    for (const user of day2Users || []) {
      try {
        // Check if reminder already sent
        const { data: existingReminder } = await supabase
          .from("welcome_bonus_reminders")
          .select("id")
          .eq("user_id", user.id)
          .eq("reminder_day", 2)
          .single();

        if (existingReminder) {
          console.log(`Day 2 reminder already sent to user ${user.id}`);
          continue;
        }

        // Get user email from auth.users
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
        
        if (authError || !authUser?.user?.email) {
          console.error(`Could not get email for user ${user.id}:`, authError);
          continue;
        }

        const balancePounds = (user.promo_balance_pence / 100).toFixed(2);
        const expiresDate = new Date(user.promo_expires_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

        console.log(`Sending day 2 email to ${authUser.user.email}...`);

        const emailResult = await resend.emails.send({
          from: "Frags & Fortunes <noreply@fragsandfortunes.com>",
          to: [authUser.user.email],
          subject: `🎮 ${user.username}, your free paid entry is waiting!`,
          html: getDay2EmailHtml(user.username || "Player", balancePounds, expiresDate),
        });

        if (emailResult.error) {
          console.error(`Failed to send day 2 email to ${authUser.user.email}:`, emailResult.error);
          errors.push(`Day 2 email to ${authUser.user.email}: ${emailResult.error.message}`);
          continue;
        }

        // Record that reminder was sent
        await supabase.from("welcome_bonus_reminders").insert({
          user_id: user.id,
          reminder_day: 2
        });

        emailsSent++;
        console.log(`Day 2 email sent successfully to ${authUser.user.email}`);
      } catch (err) {
        console.error(`Error processing day 2 user ${user.id}:`, err);
        errors.push(`Day 2 user ${user.id}: ${err.message}`);
      }
    }

    // Process day 5 users
    for (const user of day5Users || []) {
      try {
        // Check if reminder already sent
        const { data: existingReminder } = await supabase
          .from("welcome_bonus_reminders")
          .select("id")
          .eq("user_id", user.id)
          .eq("reminder_day", 5)
          .single();

        if (existingReminder) {
          console.log(`Day 5 reminder already sent to user ${user.id}`);
          continue;
        }

        // Get user email from auth.users
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
        
        if (authError || !authUser?.user?.email) {
          console.error(`Could not get email for user ${user.id}:`, authError);
          continue;
        }

        const balancePounds = (user.promo_balance_pence / 100).toFixed(2);
        const expiresDate = new Date(user.promo_expires_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

        console.log(`Sending day 5 email to ${authUser.user.email}...`);

        const emailResult = await resend.emails.send({
          from: "Frags & Fortunes <noreply@fragsandfortunes.com>",
          to: [authUser.user.email],
          subject: `⚠️ Last chance ${user.username}! Your free entry expires soon`,
          html: getDay5EmailHtml(user.username || "Player", balancePounds, expiresDate),
        });

        if (emailResult.error) {
          console.error(`Failed to send day 5 email to ${authUser.user.email}:`, emailResult.error);
          errors.push(`Day 5 email to ${authUser.user.email}: ${emailResult.error.message}`);
          continue;
        }

        // Record that reminder was sent
        await supabase.from("welcome_bonus_reminders").insert({
          user_id: user.id,
          reminder_day: 5
        });

        emailsSent++;
        console.log(`Day 5 email sent successfully to ${authUser.user.email}`);
      } catch (err) {
        console.error(`Error processing day 5 user ${user.id}:`, err);
        errors.push(`Day 5 user ${user.id}: ${err.message}`);
      }
    }

    const result = {
      success: true,
      emailsSent,
      day2Candidates: day2Users?.length || 0,
      day5Candidates: day5Users?.length || 0,
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
