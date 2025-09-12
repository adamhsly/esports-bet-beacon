import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Expected path: /share/{roundId}/{userId}.png
    if (pathSegments.length !== 3 || pathSegments[0] !== 'share') {
      return new Response('Invalid path format. Expected: /share/{roundId}/{userId}.png', {
        status: 400,
        headers: corsHeaders,
      });
    }

    const roundId = pathSegments[1];
    const userFile = pathSegments[2]; // userId.png
    
    // Validate file extension
    if (!userFile.endsWith('.png')) {
      return new Response('Only PNG files are supported', {
        status: 400,
        headers: corsHeaders,
      });
    }

    const userId = userFile.replace('.png', '');
    const filePath = `${roundId}/${userId}.png`;

    console.log(`Proxying share card request for: ${filePath}`);

    // Create Supabase client with service role key for storage access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the file from storage
    const { data, error } = await supabase.storage
      .from('shares')
      .download(filePath);

    if (error) {
      console.error('Error fetching share card:', error);
      
      if (error.message.includes('Object not found')) {
        return new Response('Share card not found', {
          status: 404,
          headers: corsHeaders,
        });
      }
      
      return new Response('Failed to fetch share card', {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (!data) {
      return new Response('Share card not found', {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Return the image with appropriate headers
    return new Response(data, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Disposition': `inline; filename="${userId}-lineup.png"`,
      },
    });

  } catch (error) {
    console.error('Error in share-proxy function:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders,
    });
  }
});