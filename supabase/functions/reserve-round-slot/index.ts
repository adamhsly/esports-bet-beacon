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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const siteUrl = Deno.env.get('SITE_URL') || 'https://fragsandfortunes.com';

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const { round_id } = await req.json();
    if (!round_id) {
      throw new Error('round_id is required');
    }

    console.log(`Reserving slot for user ${user.id} in round ${round_id}`);

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if already reserved
    const { data: existing } = await adminClient
      .from('round_reservations')
      .select('id')
      .eq('round_id', round_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      // Already reserved - just get count
      const { count } = await adminClient
        .from('round_reservations')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', round_id);

      const { data: round } = await adminClient
        .from('fantasy_rounds')
        .select('status, minimum_reservations')
        .eq('id', round_id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          already_reserved: true,
          reservation_count: count || 0,
          is_open: round?.status === 'open',
          minimum_reservations: round?.minimum_reservations || 30,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create reservation
    const { error: insertError } = await adminClient
      .from('round_reservations')
      .insert({
        round_id,
        user_id: user.id,
      });

    if (insertError) {
      console.error('Reservation insert error:', insertError);
      throw new Error('Failed to create reservation');
    }

    // Get updated count
    const { count } = await adminClient
      .from('round_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', round_id);

    // Get round details
    const { data: round } = await adminClient
      .from('fantasy_rounds')
      .select('status, minimum_reservations, round_name, entry_fee, prize_1st, prize_2nd, prize_3rd, prize_type')
      .eq('id', round_id)
      .single();

    const minimumReservations = round?.minimum_reservations || 30;
    const reservationCount = count || 0;

    // Check if we hit threshold
    let isOpen = round?.status === 'open';
    if (reservationCount >= minimumReservations && !isOpen) {
      console.log(`Threshold reached! Opening round ${round_id}`);
      
      // Update round status to open
      await adminClient
        .from('fantasy_rounds')
        .update({ status: 'open' })
        .eq('id', round_id);

      // Mark all reservations as notified
      await adminClient
        .from('round_reservations')
        .update({ notified_at: new Date().toISOString(), notified_open: true })
        .eq('round_id', round_id);

      isOpen = true;

      // Send email notifications to all reserved users
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        
        // Get all reserved user IDs
        const { data: reservations } = await adminClient
          .from('round_reservations')
          .select('user_id')
          .eq('round_id', round_id);
        
        const userIds = reservations?.map(r => r.user_id) || [];
        
        // Get user emails from auth with pagination
        const perPage = 1000;
        let authPage = 1;
        let allAuthUsers: any[] = [];

        for (let i = 0; i < 20; i++) {
          const { data, error } = await adminClient.auth.admin.listUsers({ page: authPage, perPage });
          if (error) {
            console.error('Error fetching users page', authPage, error);
            break;
          }
          allAuthUsers = allAuthUsers.concat(data.users || []);
          const nextPage = (data as any).nextPage as number | null;
          if (!nextPage) break;
          authPage = nextPage;
        }

        const userEmails = allAuthUsers
          .filter(u => userIds.includes(u.id) && u.email)
          .map(u => ({ id: u.id, email: u.email! }));

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
        const entryFeeDisplay = round.entry_fee ? `$${(round.entry_fee / 100).toFixed(2)}` : 'Free';

        for (const userInfo of userEmails) {
          try {
            await resend.emails.send({
              from: 'Frags & Fortunes <noreply@fragsandfortunes.com>',
              to: [userInfo.email],
              subject: `🎮 ${round.round_name} is NOW OPEN! Time to pick your teams!`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <h1 style="color: #8B5CF6; margin-bottom: 16px;">The Round is Open! 🎉</h1>
                  <p style="font-size: 16px; color: #333;">Great news! <strong>${round.round_name}</strong> has reached the minimum number of players and is now open for entries.</p>
                  
                  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); border-radius: 12px; padding: 20px; margin: 24px 0; color: white;">
                    <h2 style="margin: 0 0 12px 0; color: #a78bfa;">Round Details</h2>
                    <p style="margin: 8px 0;"><strong>Entry Fee:</strong> ${entryFeeDisplay}</p>
                    <p style="margin: 8px 0;"><strong>Total Prize Pool:</strong> ${prizeDisplay}</p>
                  </div>
                  
                  <p style="font-size: 16px; color: #333;">Your reservation is confirmed - now it's time to pay and submit your team lineup!</p>
                  
                  <a href="${siteUrl}/fantasy?roundId=${round_id}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
                    Pick Your Teams Now →
                  </a>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 24px;">Good luck!</p>
                  <p style="font-size: 14px; color: #666;">- The Frags & Fortunes Team</p>
                </div>
              `,
            });
            console.log(`Email sent to ${userInfo.email}`);
          } catch (emailError) {
            console.error(`Failed to send email to ${userInfo.email}:`, emailError);
          }
        }
      } else {
        console.log('RESEND_API_KEY not configured, skipping email notifications');
      }
    }

    console.log(`Reservation created. Count: ${reservationCount}/${minimumReservations}`);

    return new Response(
      JSON.stringify({
        success: true,
        reservation_count: reservationCount,
        minimum_reservations: minimumReservations,
        is_open: isOpen,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Reserve slot error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
