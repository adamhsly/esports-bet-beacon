import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🏆 Starting fantasy round winner awards...');

    // Find rounds that have closed (ended) but haven't been processed yet
    const { data: recentlyFinishedRounds, error: roundsError } = await supabase
      .from('fantasy_rounds')
      .select('id, type, end_date, round_name, prize_type, prize_1st, prize_2nd, prize_3rd')
      .eq('status', 'closed')
      .lte('end_date', new Date().toISOString());

    if (roundsError) {
      console.error('Error fetching finished rounds:', roundsError);
      throw roundsError;
    }

    console.log(`Found ${recentlyFinishedRounds?.length || 0} recently finished rounds`);

    let totalWinnersAwarded = 0;
    let totalEmailsSent = 0;

    for (const round of recentlyFinishedRounds || []) {
      console.log(`Processing round ${round.id} (${round.type})`);

      // Award winners (creates records if they don't exist, idempotent)
      const { error: awardError } = await supabase
        .rpc('award_round_winners', { p_round_id: round.id });

      if (awardError) {
        console.error(`Error awarding winners for round ${round.id}:`, awardError);
        continue;
      }

      // Query for winners who haven't received email notifications yet
      const { data: unsentWinners, error: winnersError } = await supabase
        .from('fantasy_round_winners')
        .select(`
          id,
          user_id,
          finish_position,
          total_score,
          credits_awarded,
          profiles!inner(username, full_name, test)
        `)
        .eq('round_id', round.id)
        .eq('notification_sent', false);

      if (winnersError) {
        console.error(`Error fetching unsent winners for round ${round.id}:`, winnersError);
        continue;
      }

      if (!unsentWinners || unsentWinners.length === 0) {
        console.log(`No unsent notifications for round ${round.id}`);
        continue;
      }

      console.log(`Found ${unsentWinners.length} unsent notifications for round ${round.id}`);
      totalWinnersAwarded += unsentWinners.length;

      // Collect winner data for team summary email
      const winnersForSummary: any[] = [];

      // Send email notifications to winners
      for (const winner of unsentWinners) {
        try {
          // Get user email from auth.users
          const { data: authUser } = await supabase.auth.admin.getUserById(winner.user_id);
          const userEmail = authUser?.user?.email;

          if (!userEmail) {
            console.error(`No email found for winner ${winner.id}`);
            continue;
          }

          const isTestUser = winner.profiles?.test === true;
          const prizeAmount = getPrizeAmount(winner.finish_position, round);
          const prizeType = round.prize_type || (round.type === 'monthly' ? 'vouchers' : 'credits');

          const winnerData = {
            finish_position: winner.finish_position,
            total_score: winner.total_score,
            credits_awarded: winner.credits_awarded,
            username: winner.profiles?.username || winner.profiles?.full_name || 'Player',
            user_email: userEmail,
            is_test_user: isTestUser,
            prize_amount: prizeAmount,
            prize_type: prizeType,
          };

          // Add to summary list
          winnersForSummary.push(winnerData);

          const emailSubject = getEmailSubject(winner.finish_position, round.type);
          const emailHtml = generateWinnerEmail(winnerData, round);
          
          const { error: emailError } = await resend.emails.send({
            from: "Frags & Fortunes <theteam@fragsandfortunes.com>",
            to: [userEmail],
            subject: emailSubject,
            html: emailHtml,
          });

          if (emailError) {
            console.error(`Failed to send email to ${userEmail}:`, emailError);
          } else {
            // Mark as sent ONLY after successful email delivery
            const { error: updateError } = await supabase
              .from('fantasy_round_winners')
              .update({ notification_sent: true })
              .eq('id', winner.id);

            if (updateError) {
              console.error(`Failed to mark notification as sent for winner ${winner.id}:`, updateError);
            } else {
              totalEmailsSent++;
              console.log(`✅ Email sent to ${winnerData.username} (${userEmail})`);
            }
          }
        } catch (emailError) {
          console.error(`Error sending email for winner ${winner.id}:`, emailError);
        }
      }

      // Send team summary email
      if (winnersForSummary.length > 0) {
        try {
          const summaryEmailHtml = generateTeamSummaryEmail(round, winnersForSummary);
          const roundName = round.round_name || `${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round`;
          
          const { error: summaryEmailError } = await resend.emails.send({
            from: "Frags & Fortunes <theteam@fragsandfortunes.com>",
            to: ["theteam@fragsandfortunes.com"],
            subject: `🏆 Round Finished: ${roundName} - Winners Summary`,
            html: summaryEmailHtml,
          });

          if (summaryEmailError) {
            console.error(`Failed to send team summary email:`, summaryEmailError);
          } else {
            console.log(`✅ Team summary email sent for round ${round.id}`);
          }
        } catch (summaryError) {
          console.error(`Error sending team summary email:`, summaryError);
        }
      }

      console.log(`Winners processed for round ${round.id}: ${unsentWinners.length} winners`);

      // Mark round as 'finished' after successfully processing winners
      const { error: statusError } = await supabase
        .from('fantasy_rounds')
        .update({ status: 'finished', updated_at: new Date().toISOString() })
        .eq('id', round.id);

      if (statusError) {
        console.error(`Failed to mark round ${round.id} as finished:`, statusError);
      } else {
        console.log(`✅ Round ${round.id} marked as finished`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rounds_processed: recentlyFinishedRounds?.length || 0,
        winners_awarded: totalWinnersAwarded,
        emails_sent: totalEmailsSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error in award-fantasy-winners:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function getPrizeAmount(position: number, round: any): string {
  const prizeType = round.prize_type || (round.type === 'monthly' ? 'vouchers' : 'credits');
  
  // Use dynamic prize values from round if available
  if (position === 1 && round.prize_1st !== null) {
    return prizeType === 'vouchers' ? formatPence(round.prize_1st) : `${round.prize_1st}`;
  }
  if (position === 2 && round.prize_2nd !== null) {
    return prizeType === 'vouchers' ? formatPence(round.prize_2nd) : `${round.prize_2nd}`;
  }
  if (position === 3 && round.prize_3rd !== null) {
    return prizeType === 'vouchers' ? formatPence(round.prize_3rd) : `${round.prize_3rd}`;
  }
  
  // Fallback to legacy monthly prizes
  if (round.type === 'monthly') {
    const monthlyPrizes: Record<number, string> = { 1: '£100', 2: '£30', 3: '£5' };
    return monthlyPrizes[position] || '£0';
  }
  
  // Default credit prizes
  const defaultCredits: Record<number, number> = { 1: 200, 2: 100, 3: 50 };
  return `${defaultCredits[position] || 0}`;
}

function formatPence(pence: number): string {
  const dollars = pence / 100;
  return `$${dollars.toFixed(dollars % 1 === 0 ? 0 : 2)}`;
}

function getEmailSubject(position: number, roundType: string): string {
  const roundTypeTitle = roundType.charAt(0).toUpperCase() + roundType.slice(1);
  const medals = ['🥇', '🥈', '🥉'];
  const places = ['1st Place', '2nd Place', '3rd Place'];
  
  if (roundType === 'monthly') {
    return `${medals[position - 1]} You won a Steam Voucher! ${places[position - 1]} in the ${roundTypeTitle} Fantasy Round!`;
  }
  
  return `${medals[position - 1]} You finished ${places[position - 1]} in the ${roundTypeTitle} Fantasy Round!`;
}

function generateTeamSummaryEmail(round: any, winners: any[]): string {
  const roundName = round.round_name || `${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round`;
  const roundType = round.type.charAt(0).toUpperCase() + round.type.slice(1);
  const prizeType = round.prize_type || (round.type === 'monthly' ? 'vouchers' : 'credits');
  const prizeTypeLabel = prizeType === 'vouchers' ? 'Steam Vouchers' : 'Credits';
  
  // Sort winners by position
  const sortedWinners = [...winners].sort((a, b) => a.finish_position - b.finish_position);
  
  const winnersHtml = sortedWinners.map(winner => {
    const medals = ['🥇', '🥈', '🥉'];
    const places = ['1st', '2nd', '3rd'];
    const position = winner.finish_position - 1;
    const testUserBadge = winner.is_test_user 
      ? '<span style="background: #F56565; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">TEST USER</span>' 
      : '';
    const prizeDisplay = prizeType === 'vouchers' ? winner.prize_amount : `${winner.prize_amount} credits`;
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #E2E8F0;">
          ${medals[position]} ${places[position]}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #E2E8F0;">
          ${winner.username}${testUserBadge}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #E2E8F0;">
          ${winner.user_email}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #E2E8F0;">
          ${winner.total_score} pts
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #E2E8F0;">
          <strong>${prizeDisplay}</strong>
        </td>
      </tr>
    `;
  }).join('');

  const testUserCount = sortedWinners.filter(w => w.is_test_user).length;
  const realUserCount = sortedWinners.length - testUserCount;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .info-box { background: #F7FAFC; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E2E8F0; }
        .info-row:last-child { border-bottom: none; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #667eea; color: white; padding: 12px; text-align: left; }
        .warning-box { background: #FED7D7; border: 1px solid #FC8181; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .success-box { background: #C6F6D5; border: 1px solid #68D391; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🏆 Round Complete!</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">${roundName}</p>
        </div>
        
        <div class="content">
          <div class="info-box">
            <div class="info-row">
              <span><strong>Round Name:</strong></span>
              <span>${roundName}</span>
            </div>
            <div class="info-row">
              <span><strong>Round Type:</strong></span>
              <span>${roundType}</span>
            </div>
            <div class="info-row">
              <span><strong>Prize Type:</strong></span>
              <span>${prizeTypeLabel}</span>
            </div>
            <div class="info-row">
              <span><strong>End Date:</strong></span>
              <span>${new Date(round.end_date).toLocaleDateString('en-GB', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>

          ${testUserCount > 0 ? `
          <div class="warning-box">
            ⚠️ <strong>${testUserCount} of ${sortedWinners.length} winners are TEST USERS</strong> - No action required for test user prizes.
          </div>
          ` : `
          <div class="success-box">
            ✅ <strong>All ${sortedWinners.length} winners are real users</strong> - ${prizeType === 'vouchers' ? 'Steam vouchers need to be sent.' : 'Credits have been awarded automatically.'}
          </div>
          `}

          <h2>🏅 Winners</h2>
          <table>
            <thead>
              <tr>
                <th>Position</th>
                <th>Username</th>
                <th>Email</th>
                <th>Score</th>
                <th>Prize</th>
              </tr>
            </thead>
            <tbody>
              ${winnersHtml}
            </tbody>
          </table>

          ${prizeType === 'vouchers' && realUserCount > 0 ? `
          <div class="warning-box">
            📧 <strong>Action Required:</strong> Please send Steam vouchers to the ${realUserCount} real user(s) listed above.
          </div>
          ` : ''}

          <p style="color: #718096; font-size: 14px; margin-top: 30px;">
            This is an automated notification from Frags & Fortunes.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Monthly Steam voucher prizes (legacy fallback)
const MONTHLY_STEAM_PRIZES: Record<number, string> = {
  1: '£100',
  2: '£30',
  3: '£5',
};

function generateWinnerEmail(winner: any, round: any): string {
  const medals = ['🥇', '🥈', '🥉'];
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const places = ['1st', '2nd', '3rd'];
  
  const position = winner.finish_position - 1;
  const roundTypeTitle = round.type.charAt(0).toUpperCase() + round.type.slice(1);
  const prizeType = winner.prize_type || (round.type === 'monthly' ? 'vouchers' : 'credits');
  const isVoucherPrize = prizeType === 'vouchers';

  const prizeSection = isVoucherPrize ? `
          <div class="prize-box">
            <p style="margin: 0; font-size: 20px;">You've won a</p>
            <div class="prize-amount">${winner.prize_amount}</div>
            <p style="margin: 0; font-size: 20px;">Steam Voucher!</p>
          </div>
          
          <div style="background: #EBF8FF; border: 2px solid #63B3ED; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #2B6CB0; font-size: 16px;">
              🎮 <strong>We'll be in contact shortly to process your Steam voucher prize!</strong>
            </p>
            <p style="margin: 10px 0 0 0; color: #4A5568; font-size: 14px;">
              Please keep an eye on your inbox for further details.
            </p>
          </div>
  ` : `
          <div class="prize-box">
            <p style="margin: 0; font-size: 20px;">You've earned</p>
            <div class="prize-amount">${winner.credits_awarded}</div>
            <p style="margin: 0; font-size: 20px;">Bonus Credits!</p>
          </div>
  `;

  const closingText = isVoucherPrize 
    ? `Check your inbox for details about your Steam voucher prize!`
    : `Use your bonus credits to enter more fantasy rounds and climb the leaderboard!`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px 10px 0 0; }
        .medal { font-size: 64px; margin-bottom: 20px; }
        .content { background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .prize-box { background: ${colors[position]}; color: white; padding: 30px; text-align: center; border-radius: 10px; margin: 30px 0; }
        .prize-amount { font-size: 48px; font-weight: bold; margin: 10px 0; }
        .stats { background: #f7fafc; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin-top: 20px; font-weight: bold; }
        .footer { text-align: center; color: #718096; margin-top: 40px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="medal">${medals[position]}</div>
          <h1>Congratulations, ${winner.username}!</h1>
          <p style="font-size: 20px; margin: 10px 0;">You finished in ${places[position]} place!</p>
        </div>
        
        <div class="content">
          <p style="font-size: 18px;">Amazing job in the <strong>${roundTypeTitle} Fantasy Round</strong>!</p>
          
          ${prizeSection}
          
          <div class="stats">
            <div class="stat-row">
              <span><strong>Your Position:</strong></span>
              <span>${places[position]} Place</span>
            </div>
            <div class="stat-row">
              <span><strong>Final Score:</strong></span>
              <span>${winner.total_score} points</span>
            </div>
            <div class="stat-row">
              <span><strong>Round Type:</strong></span>
              <span>${roundTypeTitle}</span>
            </div>
            <div class="stat-row" style="border-bottom: none;">
              <span><strong>Prize:</strong></span>
              <span>${isVoucherPrize ? winner.prize_amount + ' Steam Voucher' : winner.credits_awarded + ' Credits'}</span>
            </div>
          </div>
          
          <p>${closingText}</p>
          
          <center>
            <a href="https://fragsandfortunes.com/fantasy" class="cta-button">View Leaderboard</a>
          </center>
          
          <div class="footer">
            <p>Keep up the great work and see you in the next round!</p>
            <p>- The Frags & Fortunes Team</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
