import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get users who have already reserved/picked for this round (they get separate emails)
    const { data: reservedUsers } = await supabase
      .from('fantasy_round_picks')
      .select('user_id')
      .eq('round_id', round_id);
    
    const reservedUserIds = new Set((reservedUsers || []).map(r => r.user_id));
    console.log(`Found ${reservedUserIds.size} users who have reserved this round (will be excluded)`);

    // Get users who have already received a blast email for this round
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

    console.log(`Found ${eligibleUsers.length} eligible users to email (from ${allUsers.length} total, excluding ${reservedUserIds.size} reserved and ${alreadyBlastedUserIds.size} already blasted)`);

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

    const resend = new Resend(resendApiKey);
    let sentCount = 0;
    let failedCount = 0;

    for (const user of eligibleUsers) {
      try {
        await resend.emails.send({
          from: 'Frags & Fortunes <noreply@fragsandfortunes.com>',
          to: [user.email!],
          subject: `🎮 A New Round is Open! ${round.round_name} - Pick Your Teams Now`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f0f23; padding: 32px; border-radius: 16px;">
              
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #8B5CF6; margin: 0; font-size: 28px;">A New Round is Open! 🎮</h1>
              </div>
              
              <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6; text-align: center;">
                <strong style="color: #a78bfa;">${round.round_name}</strong> is now open for team submissions!
              </p>
              
              <!-- Prize Pool Card -->
              <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Total Prize Pool</p>
                <p style="margin: 0; font-size: 36px; font-weight: bold; color: white;">${formatPrize(totalPrize, prizeType)}</p>
              </div>
              
              <!-- Prize Breakdown -->
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h2 style="margin: 0 0 16px 0; color: #a78bfa; font-size: 18px; text-align: center;">Prize Breakdown</h2>
                <div style="display: table; width: 100%;">
                  <div style="display: table-row;">
                    <div style="display: table-cell; padding: 8px; color: #fbbf24; font-weight: bold;">🥇 1st Place</div>
                    <div style="display: table-cell; padding: 8px; color: white; text-align: right;">${formatPrize(prize1st, prizeType)}</div>
                  </div>
                  <div style="display: table-row;">
                    <div style="display: table-cell; padding: 8px; color: #9ca3af; font-weight: bold;">🥈 2nd Place</div>
                    <div style="display: table-cell; padding: 8px; color: white; text-align: right;">${formatPrize(prize2nd, prizeType)}</div>
                  </div>
                  <div style="display: table-row;">
                    <div style="display: table-cell; padding: 8px; color: #cd7f32; font-weight: bold;">🥉 3rd Place</div>
                    <div style="display: table-cell; padding: 8px; color: white; text-align: right;">${formatPrize(prize3rd, prizeType)}</div>
                  </div>
                </div>
              </div>
              
              <!-- Round Details -->
              <div style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h2 style="margin: 0 0 16px 0; color: #a78bfa; font-size: 18px; text-align: center;">Round Details</h2>
                <div style="display: table; width: 100%;">
                  <div style="display: table-row;">
                    <div style="display: table-cell; padding: 6px 0; color: #9ca3af;">Team Type</div>
                    <div style="display: table-cell; padding: 6px 0; color: white; text-align: right;">${teamType}</div>
                  </div>
                  <div style="display: table-row;">
                    <div style="display: table-cell; padding: 6px 0; color: #9ca3af;">Entry Fee</div>
                    <div style="display: table-cell; padding: 6px 0; color: white; text-align: right;">${entryFee}</div>
                  </div>
                  <div style="display: table-row;">
                    <div style="display: table-cell; padding: 6px 0; color: #9ca3af;">Games</div>
                    <div style="display: table-cell; padding: 6px 0; color: white; text-align: right;">CS2 • Valorant • LoL • Dota 2</div>
                  </div>
                </div>
              </div>
              
              <p style="font-size: 16px; color: #e0e0e0; line-height: 1.6; text-align: center; margin: 24px 0;">
                Pick your esports dream team and compete for glory!
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://fragsandfortunes.com/fantasy" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Pick Your Teams Now →
                </a>
              </div>
              
              <p style="font-size: 14px; color: #555; line-height: 1.6; text-align: center; margin-top: 24px;">
                Don't forget you have 1 team swap and one star team change during the round - use them wisely!
              </p>
              
              <div style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 32px; padding-top: 24px; text-align: center;">
                <p style="font-size: 14px; color: #666; margin: 0;">Good luck!</p>
                <p style="font-size: 14px; color: #666; margin: 8px 0 0 0;">- The Frags & Fortunes Team</p>
              </div>
            </div>
          `,
        });
        
        // Record that we sent this blast email
        await supabase
          .from('round_blast_emails')
          .insert({ round_id, user_id: user.id, email: user.email });
        
        sentCount++;
        console.log(`Email sent to ${user.email}`);
      } catch (emailError) {
        failedCount++;
        console.error(`Failed to send email to ${user.email}:`, emailError);
      }
    }

    console.log(`Blast complete: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Blast email sent to ${sentCount} users`,
        sent: sentCount,
        failed: failedCount,
        total: eligibleUsers.length,
        excludedReserved: reservedUserIds.size,
        excludedAlreadyBlasted: alreadyBlastedUserIds.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending blast:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
