import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const assetPrompts = {
  hero_banner: "Dark esports arena background with subtle neon purple and blue gradient glows at the edges, abstract silhouettes of tournament stages and gaming monitors in the background, modern minimalist style, no text, no people, cinematic lighting, wide banner format",
  shield_icon: "Stylized shield emblem icon with gold and purple neon glow, esports gaming aesthetic, transparent background, simple geometric design, glowing edges",
  leaderboard_icon: "Neon blue leaderboard or ranking icon, modern esports style, glowing lines and dots, simple geometric shapes, transparent background",
  trophy_icon: "Neon yellow trophy icon with glow effect, esports championship style, modern geometric design, transparent background, victory celebration aesthetic"
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { asset_type } = await req.json();
    
    if (!asset_type || !assetPrompts[asset_type as keyof typeof assetPrompts]) {
      return new Response(
        JSON.stringify({ error: 'Invalid asset_type. Must be: hero_banner, shield_icon, leaderboard_icon, or trophy_icon' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = assetPrompts[asset_type as keyof typeof assetPrompts];
    console.log(`Generating ${asset_type} with prompt: ${prompt}`);

    // Call Lovable AI Gateway for image generation
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Determine file extension based on asset type
    const extension = asset_type === 'hero_banner' ? 'png' : 'png';
    const fileName = `${asset_type}.${extension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('welcome-assets')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('welcome-assets')
      .getPublicUrl(fileName);

    console.log(`Successfully generated and uploaded ${asset_type}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        asset_type,
        url: publicUrl,
        message: `${asset_type} generated and uploaded successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-welcome-assets:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
