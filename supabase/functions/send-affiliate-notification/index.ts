import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AffiliateApplicationRequest {
  name: string;
  email: string;
  platformLinks: string[];
  avgViewers: string;
  discord: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, platformLinks, avgViewers, discord, message }: AffiliateApplicationRequest = await req.json();

    console.log("Sending affiliate application notification for:", name, email);

    const platformLinksHtml = platformLinks.length > 0 
      ? platformLinks.map(link => `<li><a href="${link}">${link}</a></li>`).join('')
      : '<li>No links provided</li>';

    const emailResponse = await resend.emails.send({
      from: "Frags & Fortunes <noreply@fragsandfortunes.com>",
      to: ["theteam@fragsandfortunes.com"],
      subject: `New Partner Application: ${name}`,
      html: `
        <h1>New Partner Program Application</h1>
        <p>A new creator has applied to the partner program:</p>
        
        <h2>Applicant Details</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Name</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Discord</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${discord || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Average Viewers</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${avgViewers || 'Not provided'}</td>
          </tr>
        </table>
        
        <h3>Platform Links</h3>
        <ul>
          ${platformLinksHtml}
        </ul>
        
        ${message ? `<h3>Message</h3><p>${message}</p>` : ''}
        
        <hr style="margin: 20px 0;" />
        <p style="color: #666; font-size: 12px;">
          Please review this application in the admin panel and respond within 48 hours.
        </p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-affiliate-notification function:", error);
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
