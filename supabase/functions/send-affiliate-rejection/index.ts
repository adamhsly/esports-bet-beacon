import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AffiliateRejectionRequest {
  name: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email }: AffiliateRejectionRequest = await req.json();

    console.log(`Sending rejection email to ${email} for ${name}`);

    const emailResponse = await resend.emails.send({
      from: "Frags & Fortunes <noreply@fragsandfortunes.com>",
      to: [email],
      subject: `Your Frags & Fortunes Partner Application`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #4B5563, #6B7280); padding: 30px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 28px; }
            .content { padding: 30px; }
            .highlight-box { background-color: #f3f4f6; border-left: 4px solid #6B7280; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .footer { background-color: #1a1a2e; color: #ffffff; padding: 20px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Hi ${name},</h1>
            </div>
            <div class="content">
              <p>Thank you for your interest in the <strong>Frags & Fortunes Partner Program</strong>.</p>
              
              <div class="highlight-box">
                <p>After reviewing your application, we've decided that we're unfortunately unable to offer you a partnership at this time.</p>
              </div>

              <p>This could be due to a number of reasons, including:</p>
              <ul>
                <li>Current audience size or engagement metrics</li>
                <li>Content focus not aligned with our esports platform</li>
                <li>We're currently at capacity for new partners</li>
              </ul>

              <p>We encourage you to continue growing your presence in the esports community. You're welcome to reapply in the future as your channel develops.</p>

              <p>If you have any questions about this decision, feel free to reach out to us at <a href="mailto:theteam@fragsandfortunes.com">theteam@fragsandfortunes.com</a>.</p>

              <p>Best wishes,</p>
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

    console.log("Rejection email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending rejection email:", error);
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
