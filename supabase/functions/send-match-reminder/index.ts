
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MatchReminderRequest {
  userId: string;
  matchId: string;
  matchDetails: {
    teams: Array<{ name: string; logo?: string }>;
    startTime: string;
    competition_name?: string;
  };
  userEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, matchId, matchDetails, userEmail }: MatchReminderRequest = await req.json();

    const team1 = matchDetails.teams[0]?.name || 'Team 1';
    const team2 = matchDetails.teams[1]?.name || 'Team 2';
    const matchTime = new Date(matchDetails.startTime).toLocaleString();
    const competition = matchDetails.competition_name || 'FACEIT Match';

    const emailResponse = await resend.emails.send({
      from: "EsportsBeacon <notifications@resend.dev>",
      to: [userEmail],
      subject: `Match Starting Soon: ${team1} vs ${team2}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1a1a1a; color: white; padding: 20px; border-radius: 8px;">
            <h1 style="color: #ff6b35; margin: 0 0 20px 0;">Match Starting in 15 Minutes!</h1>
            
            <div style="background: #2a2a2a; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h2 style="margin: 0 0 10px 0; text-align: center;">${team1} vs ${team2}</h2>
              <p style="margin: 5px 0; color: #ccc;"><strong>Tournament:</strong> ${competition}</p>
              <p style="margin: 5px 0; color: #ccc;"><strong>Start Time:</strong> ${matchTime}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.co')}/faceit/match/${matchId}" 
                 style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Watch Match Live
              </a>
            </div>

            <p style="color: #888; font-size: 14px; text-align: center; margin-top: 30px;">
              You're receiving this because you subscribed to notifications for this match.<br>
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.co')}/faceit/match/${matchId}" style="color: #ff6b35;">Manage your notifications</a>
            </p>
          </div>
        </div>
      `,
    });

    console.log("Match reminder email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-match-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
