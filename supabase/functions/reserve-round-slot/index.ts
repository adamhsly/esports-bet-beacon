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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
      .select('status, minimum_reservations, round_name')
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
        .update({ notified_at: new Date().toISOString() })
        .eq('round_id', round_id);

      isOpen = true;

      // TODO: Send email notifications
      console.log(`Would send open notifications to ${reservationCount} users`);
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
