import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("📧 Starting daily round report...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all open and scheduled rounds with price and pick counts
    const { data: rounds, error: roundsError } = await supabase
      .from("fantasy_rounds")
      .select("id, round_name, status, start_date, end_date, is_paid, team_type, type")
      .in("status", ["open", "scheduled"])
      .order("start_date", { ascending: true });

    if (roundsError) {
      console.error("Error fetching rounds:", roundsError);
      throw roundsError;
    }

    console.log(`Found ${rounds?.length || 0} open/scheduled rounds`);

    // Get counts for each round
    const roundData: Array<{
      round_name: string;
      status: string;
      start_date: string;
      is_paid: boolean;
      team_type: string;
      type: string;
      price_count: number;
      pick_count: number;
    }> = [];

    for (const round of rounds || []) {
      // Get team prices count
      const { count: priceCount } = await supabase
        .from("fantasy_team_prices")
        .select("*", { count: "exact", head: true })
        .eq("round_id", round.id);

      // Get picks count
      const { count: pickCount } = await supabase
        .from("fantasy_round_picks")
        .select("*", { count: "exact", head: true })
        .eq("round_id", round.id);

      roundData.push({
        round_name: round.round_name,
        status: round.status,
        start_date: round.start_date,
        is_paid: round.is_paid,
        team_type: round.team_type,
        type: round.type,
        price_count: priceCount || 0,
        pick_count: pickCount || 0,
      });
    }

    // Group by status
    const openRounds = roundData.filter(r => r.status === "open");
    const scheduledRounds = roundData.filter(r => r.status === "scheduled");

    // Format date
    const today = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Build HTML table rows
    const buildTableRows = (rounds: typeof roundData) => {
      if (rounds.length === 0) return "<tr><td colspan='5' style='padding: 12px; text-align: center; color: #666;'>No rounds</td></tr>";
      
      return rounds.map(r => {
        const startDate = new Date(r.start_date).toLocaleDateString("en-GB", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const paidBadge = r.is_paid 
          ? '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">PAID</span>'
          : '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">FREE</span>';
        
        const priceWarning = r.price_count === 0 ? ' ⚠️' : '';
        const pickWarning = r.pick_count === 0 ? ' ⚠️' : '';
        
        return `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px; font-weight: 500;">${r.round_name} ${paidBadge}</td>
            <td style="padding: 12px; text-align: center;">${startDate}</td>
            <td style="padding: 12px; text-align: center; ${r.price_count === 0 ? 'color: #dc2626; font-weight: bold;' : ''}">${r.price_count.toLocaleString()}${priceWarning}</td>
            <td style="padding: 12px; text-align: center; ${r.pick_count === 0 ? 'color: #dc2626; font-weight: bold;' : ''}">${r.pick_count.toLocaleString()}${pickWarning}</td>
          </tr>
        `;
      }).join("");
    };

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; padding: 20px;">
        <div style="max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📊 Daily Fantasy Rounds Report</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${today}</p>
          </div>
          
          <div style="padding: 24px;">
            
            <!-- Summary -->
            <div style="display: flex; gap: 16px; margin-bottom: 24px;">
              <div style="flex: 1; background: #fef3c7; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #d97706;">${openRounds.length}</div>
                <div style="color: #92400e; font-size: 14px;">Open Rounds</div>
              </div>
              <div style="flex: 1; background: #dbeafe; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 32px; font-weight: bold; color: #2563eb;">${scheduledRounds.length}</div>
                <div style="color: #1e40af; font-size: 14px;">Scheduled Rounds</div>
              </div>
            </div>

            <!-- Open Rounds -->
            <h2 style="color: #d97706; border-bottom: 2px solid #fef3c7; padding-bottom: 8px; margin-bottom: 16px;">
              🟢 Open Rounds (${openRounds.length})
            </h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px; background: #fefce8; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #fef9c3;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #854d0e;">Round</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #854d0e;">Start</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #854d0e;">Prices</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #854d0e;">Picks</th>
                </tr>
              </thead>
              <tbody>
                ${buildTableRows(openRounds)}
              </tbody>
            </table>

            <!-- Scheduled Rounds -->
            <h2 style="color: #2563eb; border-bottom: 2px solid #dbeafe; padding-bottom: 8px; margin-bottom: 16px;">
              🔵 Scheduled Rounds (${scheduledRounds.length})
            </h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #eff6ff; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #dbeafe;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e40af;">Round</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #1e40af;">Start</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #1e40af;">Prices</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #1e40af;">Picks</th>
                </tr>
              </thead>
              <tbody>
                ${buildTableRows(scheduledRounds)}
              </tbody>
            </table>

            <!-- Warnings -->
            ${roundData.some(r => r.price_count === 0 || r.pick_count === 0) ? `
              <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 4px; margin-top: 16px;">
                <strong style="color: #dc2626;">⚠️ Attention Required:</strong>
                <p style="color: #991b1b; margin: 8px 0 0 0; font-size: 14px;">
                  Some rounds have 0 team prices or 0 picks. Please investigate.
                </p>
              </div>
            ` : ''}

          </div>
          
          <div style="background: #f9fafb; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
            Frags & Fortunes • Daily Report • Generated at ${new Date().toISOString()}
          </div>
          
        </div>
      </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Frags & Fortunes <reports@fragsandfortunes.com>",
      to: ["theteam@fragsandfortunes.com"],
      subject: `📊 Daily Rounds Report - ${today}`,
      html: emailHtml,
    });

    console.log("✅ Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailResponse.id,
        rounds_reported: roundData.length,
        open_rounds: openRounds.length,
        scheduled_rounds: scheduledRounds.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in daily-round-report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
