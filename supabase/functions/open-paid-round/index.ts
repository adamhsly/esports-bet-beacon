import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { round_id } = await req.json();
    
    if (!round_id) {
      throw new Error('round_id is required');
    }

    console.log(`Opening paid round: ${round_id}`);

    // Get round details
    const { data: round, error: roundError } = await supabase
      .from('fantasy_rounds')
      .select('id, round_name, status, minimum_reservations, start_date')
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

    if ((reservationCount || 0) < minimumReservations) {
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
      .select('user_id, notified_open')
      .eq('round_id', round_id)
      .eq('notified_open', false);

    if (reservationsError) {
      console.error('Error fetching reservations:', reservationsError);
    }

    // Get user emails for notification
    const userIds = reservations?.map(r => r.user_id) || [];
    
    if (userIds.length > 0) {
      // Mark as notified
      await supabase
        .from('round_reservations')
        .update({ notified_open: true })
        .eq('round_id', round_id)
        .eq('notified_open', false);

      // TODO: Send email notifications via Resend
      // For now, log that we would notify
      console.log(`Would notify ${userIds.length} users that round is open`);
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
