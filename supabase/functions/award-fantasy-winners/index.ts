import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Find rounds that just finished (changed to 'finished' in last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: recentlyFinishedRounds, error: roundsError } = await supabase
      .from('fantasy_rounds')
      .select('id, type, end_date')
      .eq('status', 'finished')
      .gte('updated_at', tenMinutesAgo);

    if (roundsError) {
      console.error('Error fetching finished rounds:', roundsError);
      throw roundsError;
    }

    console.log(`Found ${recentlyFinishedRounds?.length || 0} recently finished rounds`);

    let totalWinnersAwarded = 0;
    let totalEmailsSent = 0;

    for (const round of recentlyFinishedRounds || []) {
      console.log(`Processing round ${round.id} (${round.type})`);

      // Award winners and get results
      const { data: winners, error: awardError } = await supabase
        .rpc('award_round_winners', { p_round_id: round.id });

      if (awardError) {
        console.error(`Error awarding winners for round ${round.id}:`, awardError);
        continue;
      }

      if (!winners || winners.length === 0) {
        console.log(`No winners to award for round ${round.id}`);
        continue;
      }

      totalWinnersAwarded += winners.length;

      // Email functionality removed - notifications handled in-app
      console.log(`Winners awarded for round ${round.id}: ${winners.length} winners`);
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

function getEmailSubject(position: number, roundType: string): string {
  const roundTypeTitle = roundType.charAt(0).toUpperCase() + roundType.slice(1);
  const medals = ['🥇', '🥈', '🥉'];
  const places = ['1st Place', '2nd Place', '3rd Place'];
  
  return `${medals[position - 1]} You finished ${places[position - 1]} in the ${roundTypeTitle} Fantasy Round!`;
}

function generateWinnerEmail(winner: any, round: any): string {
  const medals = ['🥇', '🥈', '🥉'];
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const places = ['1st', '2nd', '3rd'];
  
  const position = winner.finish_position - 1;
  const roundTypeTitle = round.type.charAt(0).toUpperCase() + round.type.slice(1);

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
          
          <div class="prize-box">
            <p style="margin: 0; font-size: 20px;">You've earned</p>
            <div class="prize-amount">${winner.credits_awarded}</div>
            <p style="margin: 0; font-size: 20px;">Bonus Credits!</p>
          </div>
          
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
              <span><strong>Credits Awarded:</strong></span>
              <span>${winner.credits_awarded} Credits</span>
            </div>
          </div>
          
          <p>Use your bonus credits to enter more fantasy rounds and climb the leaderboard!</p>
          
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
