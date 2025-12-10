import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AffiliateApprovalRequest {
  name: string;
  email: string;
  referralCode: string;
  tier: string;
  revSharePercent: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, referralCode, tier, revSharePercent }: AffiliateApprovalRequest = await req.json();

    console.log(`Sending approval email to ${email} for ${name}`);

    const referralLink = `https://fragsandfortunes.com/?ref=${referralCode}`;

    const emailResponse = await resend.emails.send({
      from: "Frags & Fortunes <noreply@fragsandfortunes.com>",
      to: [email],
      subject: `🎉 Welcome to the Frags & Fortunes Partner Program!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #8B5CF6, #D946EF); padding: 30px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
            .content { padding: 30px; }
            .highlight-box { background-color: #f8f4ff; border-left: 4px solid #8B5CF6; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .referral-code { background-color: #1a1a2e; color: #ffd700; padding: 15px 25px; border-radius: 8px; font-family: monospace; font-size: 18px; text-align: center; margin: 20px 0; }
            .referral-link { background-color: #8B5CF6; color: #ffffff; padding: 15px 25px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 10px 0; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-item { text-align: center; padding: 15px; }
            .stat-value { font-size: 24px; font-weight: bold; color: #8B5CF6; }
            .stat-label { font-size: 12px; color: #666; }
            .footer { background-color: #1a1a2e; color: #ffffff; padding: 20px; text-align: center; font-size: 12px; }
            ul { padding-left: 20px; }
            li { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Welcome, ${name}!</h1>
            </div>
            <div class="content">
              <p>Congratulations! Your application to the <strong>Frags & Fortunes Partner Program</strong> has been approved!</p>
              
              <div class="highlight-box">
                <h3 style="margin-top: 0;">Your Partner Details</h3>
                <p><strong>Tier:</strong> ${tier.charAt(0).toUpperCase() + tier.slice(1)}</p>
                <p><strong>Revenue Share:</strong> ${revSharePercent}%</p>
              </div>

              <h3>Your Unique Referral Code</h3>
              <div class="referral-code">${referralCode}</div>

              <h3>Your Referral Link</h3>
              <p>Share this link with your audience:</p>
              <a href="${referralLink}" class="referral-link">${referralLink}</a>

              <h3 style="margin-top: 30px;">How It Works</h3>
              <ul>
                <li>Share your referral link with your community</li>
                <li>When users sign up using your link and enter paid fantasy rounds, you earn <strong>${revSharePercent}%</strong> of the entry fee</li>
                <li>Track your earnings in your partner dashboard</li>
                <li>Payouts are processed monthly via PayPal or bank transfer</li>
              </ul>

              <h3>Tier Progression</h3>
              <ul>
                <li><strong>Bronze (20%)</strong> - Starting tier</li>
                <li><strong>Silver (25%)</strong> - Unlocked with increased referrals</li>
                <li><strong>Gold (30%)</strong> - Top partner tier</li>
              </ul>

              <p style="margin-top: 30px;">If you have any questions, feel free to reach out to us at <a href="mailto:theteam@fragsandfortunes.com">theteam@fragsandfortunes.com</a>.</p>

              <p>Welcome to the team! 🎉</p>
              <p><strong>The Frags & Fortunes Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Frags & Fortunes. All rights reserved.</p>
              <p>This email was sent because you applied to our Partner Program.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Approval email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending approval email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
