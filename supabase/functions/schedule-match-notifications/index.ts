
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

type Team = { name: string; logo?: string };

function normalizeTeams(primary: unknown, alt?: unknown): Team[] {
  const source = Array.isArray(primary) ? primary : (Array.isArray(alt) ? alt : []);
  if (!Array.isArray(source)) {
    return [{ name: 'TBD' }, { name: 'TBD' }];
  }
  const mapped = source.map((t: any) => {
    if (t && typeof t === 'object') {
      // pandscore opponents can be like { opponent: { name, image_url } } or { name, image_url }
      const obj = t.opponent ?? t;
      const name = String(obj?.name ?? obj?.slug ?? obj?.id ?? 'TBD');
      const logo = obj?.logo ?? obj?.image_url ?? undefined;
      return { name, logo };
    }
    return { name: String(t ?? 'TBD') };
  });
  while (mapped.length < 2) mapped.push({ name: 'TBD' });
  return mapped.slice(0, 2);
}

async function getPandascoreDetails(sb: ReturnType<typeof createClient>, matchId: string) {
  // matchId looks like "pandascore_1262358" → numeric external id "1262358"
  const extId = matchId.replace(/^pandascore_/, "");

  // 1) Try by external_id (most common shape)
  let { data, error } = await sb
    .from('pandascore_matches')
    .select(
      // select broadly; we'll normalize in code
      'teams, opponents, competition_name, tournament_name, league_name, scheduled_at, start_time, id, external_id'
    )
    .eq('external_id', extId)
    .maybeSingle();

  // 2) If not found, try id equal to the full prefixed id (some schemas store it that way)
  if ((!data || error) && !data) {
    const fallbackId = `pandascore_${extId}`;
    const tryId = await sb
      .from('pandascore_matches')
      .select('teams, opponents, competition_name, tournament_name, league_name, scheduled_at, start_time, id, external_id')
      .eq('id', fallbackId)
      .maybeSingle();
    data = tryId.data;
    error = tryId.error;
  }

  if (!data || error) return null;

  const teams = normalizeTeams((data as any).teams, (data as any).opponents);
  const competition =
    (data as any).competition_name ??
    (data as any).tournament_name ??
    (data as any).league_name ??
    null;

  const whenRaw = (data as any).scheduled_at ?? (data as any).start_time;
  const startISO = whenRaw ? new Date(whenRaw).toISOString() : new Date().toISOString();

  return {
    teams,
    competition_name: competition,
    scheduled_at: startISO,
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Running scheduled match notifications check...');

    // Get current time and the 15–16 minute window (unchanged)
    const now = new Date();
    const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
    const in16Minutes = new Date(now.getTime() + 16 * 60 * 1000);

    console.log(`⏰ Checking for matches starting between ${in15Minutes.toISOString()} and ${in16Minutes.toISOString()}`);

    // Get pending notifications for matches starting in 15-16 minutes (unchanged)
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
        // Get user email from auth.users (service role used)
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(notification.user_id);

        if (userError || !userData.user?.email) {
          console.error(`❌ Failed to get user email for ${notification.user_id}:`, userError);
          errors++;
          continue;
        }

        // --- Provider-aware details fetch ---
        let matchDetails:
          | { teams: Team[]; competition_name: string | null; scheduled_at: string }
          | null = null;

        if (notification.match_id.startsWith('pandascore_')) {
          matchDetails = await getPandascoreDetails(supabase, notification.match_id);
          if (!matchDetails) {
            console.error(`❌ No pandascore match found for ${notification.match_id}`);
            errors++;
            continue;
          }
        } else {
          // Faceit path (UNCHANGED, as requested)
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

          // Keep shape identical to previous call
          matchDetails = {
            teams: normalizeTeams((matchData as any).teams),
            competition_name: (matchData as any).competition_name ?? null,
            scheduled_at: new Date((matchData as any).scheduled_at).toISOString(),
          };
        }

        // Send reminder email using Supabase Functions (unchanged contract)
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-match-reminder', {
          body: {
            userId: notification.user_id,
            matchId: notification.match_id,
            matchDetails: {
              teams: matchDetails.teams,
              startTime: matchDetails.scheduled_at,
              competition_name: matchDetails.competition_name ?? 'Upcoming match',
            },
            userEmail: userData.user.email,
          },
        });

        if (emailError) {
          throw new Error(`Email service error: ${emailError.message}`);
        }

        // Mark notification as sent (unchanged)
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
