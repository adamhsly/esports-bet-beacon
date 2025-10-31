
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Running scheduled match notifications check...');

    // Get current time and 15 minutes from now
    const now = new Date();
    const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
    const in16Minutes = new Date(now.getTime() + 16 * 60 * 1000);

    console.log(`⏰ Checking for matches starting between ${in15Minutes.toISOString()} and ${in16Minutes.toISOString()}`);

    // Get pending notifications for matches starting in 15-16 minutes
    const { data: pendingNotifications, error: notificationError } = await supabase
      .from('match_notifications')
      .select(`
        id,
        user_id,
        match_id,
        match_start_time
      `)
      .eq('notification_sent', false)
      .gte('match_start_time', in15Minutes.toISOString())
      .lt('match_start_time', in16Minutes.toISOString());

    if (notificationError) {
      throw new Error(`Failed to fetch notifications: ${notificationError.message}`);
    }

    console.log(`📧 Found ${pendingNotifications?.length || 0} pending notifications`);

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No pending notifications found',
        processed: 0 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let processed = 0;
    let errors = 0;

    // Process each notification
    for (const notification of pendingNotifications) {
      try {
        // Get user email from auth.users
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(notification.user_id);
        
        if (userError || !userData.user?.email) {
          console.error(`❌ Failed to get user email for ${notification.user_id}:`, userError);
          errors++;
          continue;
        }

        // Get match details from faceit_matches
        const { data: matchData, error: matchError } = await supabase
          .from('faceit_matches')
          .select('teams, competition_name, scheduled_at')
          .eq('match_id', notification.match_id)
          .single();

        if (matchError || !matchData) {
          console.error(`❌ Failed to get match details for ${notification.match_id}:`, matchError);
          errors++;
          continue;
        }

        // Send reminder email using Supabase client
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-match-reminder', {
          body: {
            userId: notification.user_id,
            matchId: notification.match_id,
            matchDetails: {
              teams: matchData.teams,
              startTime: matchData.scheduled_at,
              competition_name: matchData.competition_name,
            },
            userEmail: userData.user.email,
          },
        });

        if (emailError) {
          throw new Error(`Email service error: ${emailError.message}`);
        }

        // Mark notification as sent
        const { error: updateError } = await supabase
          .from('match_notifications')
          .update({ notification_sent: true })
          .eq('id', notification.id);

        if (updateError) {
          console.error(`❌ Failed to mark notification as sent:`, updateError);
          errors++;
          continue;
        }

        console.log(`✅ Sent notification for match ${notification.match_id} to user ${notification.user_id}`);
        processed++;

      } catch (error) {
        console.error(`❌ Error processing notification ${notification.id}:`, error);
        errors++;
      }
    }

    console.log(`📊 Processed ${processed} notifications, ${errors} errors`);

    return new Response(JSON.stringify({ 
      message: `Processed ${processed} notifications with ${errors} errors`,
      processed,
      errors 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Error in schedule-match-notifications function:", error);
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
