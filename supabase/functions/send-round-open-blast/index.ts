import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAILY_EMAIL_LIMIT = 80;

// Background task to send emails
async function sendBlastEmails(
  supabase: ReturnType<typeof createClient>,
  resend: Resend,
  round: any,
  eligibleUsers: any[]
) {
  console.log(`[Background] Starting to send ${eligibleUsers.length} emails for round ${round.id}`);
  
  // Format prize display
  const formatPrize = (amount: number, type: string) => {
    if (type === 'vouchers') {
      return `$${(amount / 100).toFixed(0)}`;
    }
    return `${amount} credits`;
  };

  const prize1st = round.prize_1st || 0;
  const prize2nd = round.prize_2nd || 0;
  const prize3rd = round.prize_3rd || 0;
  const totalPrize = prize1st + prize2nd + prize3rd;
  const prizeType = round.prize_type || 'credits';
  const entryFee = round.entry_fee ? `$${(round.entry_fee / 100).toFixed(2)}` : 'Free';
  const teamType = round.team_type === 'pro' ? 'Pro Teams' : round.team_type === 'amateur' ? 'Amateur Teams' : 'All Teams';

  let sentCount = 0;
  let failedCount = 0;

  for (const user of eligibleUsers) {
    try {
      await resend.emails.send({
        from: 'Frags & Fortunes <noreply@fragsandfortunes.com>',
        to: [user.email!],
        subject: `🎮 New Round Open: ${round.round_name || 'Weekly Pro Round'}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a1a; border-radius: 16px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                          🎮 New Round is OPEN!
                        </h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px;">
                        <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                          ${round.round_name || 'Weekly Pro Round'}
                        </h2>
                        
                        <p style="margin: 0 0 24px 0; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                          A new fantasy CS2 round is now open for team selection! Pick your teams and compete for prizes.
                        </p>
                        
                        <!-- Prize Pool Box -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #262626; border-radius: 12px; margin-bottom: 24px;">
                          <tr>
                            <td style="padding: 24px; text-align: center;">
                              <p style="margin: 0 0 8px 0; color: #a1a1aa; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                                Total Prize Pool
                              </p>
                              <p style="margin: 0; color: #22c55e; font-size: 36px; font-weight: 700;">
                                ${formatPrize(totalPrize, prizeType)}
                              </p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Details Grid -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                          <tr>
                            <td width="50%" style="padding: 12px; background-color: #262626; border-radius: 8px 0 0 8px;">
                              <p style="margin: 0 0 4px 0; color: #a1a1aa; font-size: 12px;">Entry Fee</p>
                              <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">${entryFee}</p>
                            </td>
                            <td width="50%" style="padding: 12px; background-color: #262626; border-radius: 0 8px 8px 0;">
                              <p style="margin: 0 0 4px 0; color: #a1a1aa; font-size: 12px;">Team Type</p>
                              <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">${teamType}</p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Prize Breakdown -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                          <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #333333;">
                              <span style="color: #fbbf24;">🥇</span>
                              <span style="color: #ffffff; margin-left: 8px;">1st Place</span>
                              <span style="color: #22c55e; float: right; font-weight: 600;">${formatPrize(prize1st, prizeType)}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #333333;">
                              <span style="color: #94a3b8;">🥈</span>
                              <span style="color: #ffffff; margin-left: 8px;">2nd Place</span>
                              <span style="color: #22c55e; float: right; font-weight: 600;">${formatPrize(prize2nd, prizeType)}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #cd7f32;">🥉</span>
                              <span style="color: #ffffff; margin-left: 8px;">3rd Place</span>
                              <span style="color: #22c55e; float: right; font-weight: 600;">${formatPrize(prize3rd, prizeType)}</span>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- CTA Button -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="https://frags-and-fortunes.lovable.app/fantasy" 
                                 style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 600;">
                                Pick Your Teams Now →
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px; background-color: #0f0f0f; text-align: center;">
                        <p style="margin: 0 0 8px 0; color: #71717a; font-size: 14px;">
                          Frags & Fortunes - Fantasy CS2
                        </p>
                        <p style="margin: 0; color: #52525b; font-size: 12px;">
                          <a href="https://frags-and-fortunes.lovable.app/settings" style="color: #52525b;">Manage email preferences</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });
      
      // Record the sent email
      await supabase
        .from('round_blast_emails')
        .insert({
          round_id: round.id,
          user_id: user.id,
          email: user.email,
        });
      
      sentCount++;
      
      // Log progress every 20 emails
      if (sentCount % 20 === 0) {
        console.log(`[Background] Progress: ${sentCount}/${eligibleUsers.length} emails sent`);
      }
    } catch (error) {
      console.error(`[Background] Failed to send email to ${user.email}:`, error);
      failedCount++;
    }
  }

  console.log(`[Background] Blast complete! Sent: ${sentCount}, Failed: ${failedCount}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const { round_id } = await req.json();
    
    if (!round_id) {
      throw new Error('round_id is required');
    }

    console.log(`Sending blast email for round: ${round_id}`);

    // Get round details
    const { data: round, error: roundError } = await supabase
      .from('fantasy_rounds')
      .select('id, round_name, status, entry_fee, prize_1st, prize_2nd, prize_3rd, prize_type, team_type, game_type')
      .eq('id', round_id)
      .single();

    if (roundError || !round) {
      throw new Error('Round not found');
    }

    if (round.status !== 'open') {
      throw new Error('Round must be open to send blast');
    }

    // Check how many blast emails were sent in the last 24 hours (across ALL rounds)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: sentInLast24h, error: countError } = await supabase
      .from('round_blast_emails')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', twentyFourHoursAgo);

    if (countError) {
      console.error('Error checking 24h email count:', countError);
    }

    const emailsSentToday = sentInLast24h || 0;
    const remainingQuota = Math.max(0, DAILY_EMAIL_LIMIT - emailsSentToday);

    console.log(`24h email quota: ${emailsSentToday}/${DAILY_EMAIL_LIMIT} used, ${remainingQuota} remaining`);

    if (remainingQuota === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Daily email limit of ${DAILY_EMAIL_LIMIT} reached. Emails will resume in next batch.`,
          eligible: 0,
          sent: 0,
          daily_limit_reached: true,
          emails_sent_today: emailsSentToday
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Get users who have already reserved/picked for this round (they get separate emails)
    const { data: reservedUsers } = await supabase
      .from('fantasy_round_picks')
      .select('user_id')
      .eq('round_id', round_id);
    
    const reservedUserIds = new Set((reservedUsers || []).map(r => r.user_id));
    console.log(`Found ${reservedUserIds.size} users who have reserved this round (will be excluded)`);

    // Get users who have already received a blast email for this round (prevents duplicates)
    const { data: alreadyBlasted } = await supabase
      .from('round_blast_emails')
      .select('user_id')
      .eq('round_id', round_id);
    
    const alreadyBlastedUserIds = new Set((alreadyBlasted || []).map(b => b.user_id));
    console.log(`Found ${alreadyBlastedUserIds.size} users who already received blast for this round (will be excluded)`);

    // Get all users with pagination
    const perPage = 1000;
    let page = 1;
    let allUsers: any[] = [];

    for (let i = 0; i < 20; i++) { // Safety limit of 20 pages (20k users max)
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      
      if (error) {
        console.error('Error fetching users page', page, error);
        break;
      }
      
      allUsers = allUsers.concat(data.users || []);
      
      const nextPage = (data as any).nextPage as number | null;
      if (!nextPage) break;
      page = nextPage;
    }
    
    // Filter out:
    // 1. Test users (emails ending in @test.local)
    // 2. Users who have reserved this round (they get separate emails)
    // 3. Users who have already received a blast email for this round
    const eligibleUsers = allUsers.filter(u => 
      u.email && 
      !u.email.endsWith('@test.local') &&
      !reservedUserIds.has(u.id) &&
      !alreadyBlastedUserIds.has(u.id)
    );

    const totalEligible = eligibleUsers.length;
    console.log(`Found ${totalEligible} eligible users to email (from ${allUsers.length} total, excluding ${reservedUserIds.size} reserved and ${alreadyBlastedUserIds.size} already blasted)`);

    if (totalEligible === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No eligible users to email',
          eligible: 0,
          sent: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Cap the batch to the remaining daily quota
    const batchUsers = eligibleUsers.slice(0, remainingQuota);
    const remainingAfterBatch = totalEligible - batchUsers.length;

    console.log(`Sending batch of ${batchUsers.length} emails (${remainingAfterBatch} remaining for future batches)`);

    // Create Resend client for background task
    const resend = new Resend(resendApiKey);

    // Start background task to send emails
    // @ts-ignore - EdgeRuntime.waitUntil is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(sendBlastEmails(supabase, resend, round, batchUsers));

    // Return immediately with the count of emails to be sent
    console.log(`Returning immediately, ${batchUsers.length} emails will be sent in background`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sending ${batchUsers.length} of ${totalEligible} eligible emails (daily limit: ${DAILY_EMAIL_LIMIT})`,
        eligible: totalEligible,
        sent: batchUsers.length,
        remaining: remainingAfterBatch,
        emails_sent_today: emailsSentToday,
        daily_limit: DAILY_EMAIL_LIMIT,
        background: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in send-round-open-blast:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
