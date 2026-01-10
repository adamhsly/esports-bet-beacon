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

    const { old_round_id, new_round_id } = await req.json();
    
    if (!old_round_id || !new_round_id) {
      throw new Error('old_round_id and new_round_id are required');
    }

    console.log(`Rolling over reservations from round ${old_round_id} to ${new_round_id}`);

    // Get old round info
    const { data: oldRound, error: oldRoundError } = await supabase
      .from('fantasy_rounds')
      .select('id, round_name')
      .eq('id', old_round_id)
      .single();

    if (oldRoundError) {
      console.error('Error fetching old round:', oldRoundError);
    }

    // Get new round info
    const { data: newRound, error: newRoundError } = await supabase
      .from('fantasy_rounds')
      .select('id, round_name')
      .eq('id', new_round_id)
      .single();

    if (newRoundError) {
      throw new Error('New round not found');
    }

    // Get all reservations for the old round
    const { data: reservations, error: reservationsError } = await supabase
      .from('round_reservations')
      .select('user_id')
      .eq('round_id', old_round_id);

    if (reservationsError) {
      throw reservationsError;
    }

    if (!reservations || reservations.length === 0) {
      console.log('No reservations to roll over');
      return new Response(
        JSON.stringify({ success: true, rolled_over: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${reservations.length} reservations to roll over`);

    // Create new reservations in the new round
    const newReservations = reservations.map(r => ({
      round_id: new_round_id,
      user_id: r.user_id,
      notified_open: false,
    }));

    const { error: insertError } = await supabase
      .from('round_reservations')
      .upsert(newReservations, { 
        onConflict: 'round_id,user_id',
        ignoreDuplicates: true 
      });

    if (insertError) {
      console.error('Error inserting new reservations:', insertError);
      throw insertError;
    }

    // Delete old reservations
    const { error: deleteError } = await supabase
      .from('round_reservations')
      .delete()
      .eq('round_id', old_round_id);

    if (deleteError) {
      console.error('Error deleting old reservations:', deleteError);
    }

    // Send notification emails to users about the rollover
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      // Get user emails with pagination
      const userIds = reservations.map(r => r.user_id);
      const perPage = 1000;
      let authPage = 1;
      let allAuthUsers: any[] = [];

      for (let i = 0; i < 20; i++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page: authPage, perPage });
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

      console.log(`Sending rollover notifications to ${userEmails.length} users`);

      for (const user of userEmails) {
        try {
          await resend.emails.send({
            from: 'Frags & Fortunes <noreply@fragsandfortunes.com>',
            to: [user.email],
            subject: `Your reservation has been moved to ${newRound.round_name}`,
            html: `
              <h1>Your Reservation Has Been Rolled Over</h1>
              <p>Hi there,</p>
              <p>The round "${oldRound?.round_name || 'Previous Round'}" didn't reach the minimum number of participants, so your reservation has been automatically moved to the next round: <strong>${newRound.round_name}</strong>.</p>
              <p>You don't need to do anything - your spot is already reserved! Share with friends to help reach the threshold faster.</p>
              <p>Good luck!</p>
              <p>- The Frags & Fortunes Team</p>
            `,
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${user.email}:`, emailError);
        }
      }
    } else {
      console.log('RESEND_API_KEY not configured, skipping email notifications');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        rolled_over: reservations.length,
        from_round: old_round_id,
        to_round: new_round_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error rolling over reservations:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});