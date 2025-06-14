
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  matchId: string;
  matchStartTime: string;
  action: 'subscribe' | 'unsubscribe' | 'check';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { matchId, matchStartTime, action }: NotificationRequest = await req.json();

    if (action === 'check') {
      // Check if user has notification for this match
      const { data: existing, error: checkError } = await supabase
        .from('match_notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .single();

      return new Response(JSON.stringify({ 
        subscribed: !!existing && !checkError 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === 'subscribe') {
      // Check if already subscribed
      const { data: existing } = await supabase
        .from('match_notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('match_id', matchId)
        .single();

      if (existing) {
        return new Response(JSON.stringify({ 
          message: 'Already subscribed to this match',
          subscribed: true 
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Create new notification
      const { data, error } = await supabase
        .from('match_notifications')
        .insert({
          user_id: user.id,
          match_id: matchId,
          match_start_time: matchStartTime,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create notification: ${error.message}`);
      }

      return new Response(JSON.stringify({ 
        message: 'Successfully subscribed to match notifications',
        subscribed: true,
        notification: data 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === 'unsubscribe') {
      // Remove notification
      const { error } = await supabase
        .from('match_notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('match_id', matchId);

      if (error) {
        throw new Error(`Failed to unsubscribe: ${error.message}`);
      }

      return new Response(JSON.stringify({ 
        message: 'Successfully unsubscribed from match notifications',
        subscribed: false 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in manage-match-notification function:", error);
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
