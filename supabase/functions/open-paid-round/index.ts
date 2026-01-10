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

    const { round_id, force } = await req.json();
    
    if (!round_id) {
      throw new Error('round_id is required');
    }

    console.log(`Opening paid round: ${round_id}, force: ${force}`);

    // Get round details
    const { data: round, error: roundError } = await supabase
      .from('fantasy_rounds')
      .select('id, round_name, status, minimum_reservations, start_date, entry_fee, prize_1st, prize_2nd, prize_3rd, prize_type')
      .eq('id', round_id)
      .single();

    if (roundError || !round) {
      throw new Error('Round not found');
    }

    // Check current reservation count
    const { count: reservationCount } = await supabase
      .from('round_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', round_id);

    const minimumReservations = round.minimum_reservations || 30;

    // Only check minimum reservations if force is not true
    if (!force && (reservationCount || 0) < minimumReservations) {
      console.log(`Round ${round_id} has ${reservationCount} reservations, needs ${minimumReservations}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Not enough reservations yet',
          current: reservationCount,
          required: minimumReservations 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update round status to open
    const { error: updateError } = await supabase
      .from('fantasy_rounds')
      .update({ status: 'open' })
      .eq('id', round_id);

    if (updateError) {
      throw updateError;
    }

    console.log(`Round ${round_id} opened successfully`);

    // Get all users who reserved but haven't been notified
    const { data: reservations, error: reservationsError } = await supabase
      .from('round_reservations')
      .select('user_id, notified_at')
      .eq('round_id', round_id)
      .is('notified_at', null);

    if (reservationsError) {
      console.error('Error fetching reservations:', reservationsError);
    }

    const userIds = reservations?.map(r => r.user_id) || [];
    
    if (userIds.length > 0) {
      // Mark as notified
      await supabase
        .from('round_reservations')
        .update({ notified_at: new Date().toISOString() })
        .eq('round_id', round_id)
        .is('notified_at', null);

      // Send email notifications via Resend
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        
        // Get user emails from auth
        const { data: users } = await supabase.auth.admin.listUsers();
        const userEmails = users?.users
          ?.filter(u => userIds.includes(u.id) && u.email)
          ?.map(u => ({ id: u.id, email: u.email! })) || [];

        console.log(`Sending open notifications to ${userEmails.length} users`);

        // Format prize display
        const formatPrize = (amount: number, type: string) => {
          if (type === 'vouchers') {
            return `$${(amount / 100).toFixed(0)}`;
          }
          return `${amount} credits`;
        };
        const totalPrize = (round.prize_1st || 0) + (round.prize_2nd || 0) + (round.prize_3rd || 0);
        const prizeDisplay = formatPrize(totalPrize, round.prize_type || 'credits');

        for (const user of userEmails) {
          try {
            await resend.emails.send({
              from: 'Frags & Fortunes <noreply@fragsandfortunes.com>',
              to: [user.email],
              subject: `🎮 ${round.round_name} is NOW OPEN! Time to pick your teams!`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #8B5CF6; margin-bottom: 16px;">The Round is Open! 🎉</h1>
                  
                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Great news! <strong>${round.round_name}</strong> has reached the minimum number of players and is now open for entries.
                  </p>
                  
                  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border-radius: 12px; padding: 20px; margin: 24px 0; color: white;">
                    <h2 style="margin: 0 0 12px 0; color: #a78bfa;">Round Details</h2>
                    <p style="margin: 8px 0; font-size: 18px;"><strong>Total Prize Pool:</strong> ${prizeDisplay}</p>
                  </div>
                  
                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Your reservation is confirmed - now it's time to submit your teams!
                  </p>
                  
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="https://fragsandfortunes.com/fantasy" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                      Pick Your Teams Now →
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #555; line-height: 1.6; margin-top: 20px;">
                    Don't forget you have 1 team swap and one star team change during the round - use them wisely!
                  </p>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 24px;">Good luck!</p>
                  <p style="font-size: 14px; color: #666;">- The Frags & Fortunes Team</p>
                </div>
              `,
            });
            console.log(`Email sent to ${user.email}`);
          } catch (emailError) {
            console.error(`Failed to send email to ${user.email}:`, emailError);
          }
        }
      } else {
        console.log('RESEND_API_KEY not configured, skipping email notifications');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Round opened and users notified',
        reservations: reservationCount,
        notified: userIds.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error opening paid round:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
