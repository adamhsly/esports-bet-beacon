import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all blog posts
    const { data: posts, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, content_markdown');

    if (fetchError) {
      console.error('Error fetching posts:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${posts?.length || 0} blog posts to process`);

    let updatedCount = 0;
    const results: { id: string; updated: boolean; error?: string }[] = [];

    for (const post of posts || []) {
      const originalContent = post.content_markdown;
      
      // Remove lines containing "Tournament Wins" (various formats)
      // Pattern matches: "- Tournament Wins: X" or "Tournament Wins: X" or "- **Tournament Wins:** X" etc.
      let cleanedContent = originalContent
        // Remove bullet point lines with Tournament Wins
        .replace(/^\s*-\s*\*?\*?Tournament Wins\*?\*?:?\s*\d+\s*$/gim, '')
        // Remove lines starting with Tournament Wins
        .replace(/^\s*\*?\*?Tournament Wins\*?\*?:?\s*\d+\s*$/gim, '')
        // Remove "tournament wins" mentions in prose (case insensitive)
        .replace(/,?\s*tournament wins:?\s*\d+/gi, '')
        // Remove references to "X tournament wins" in text
        .replace(/\d+\s+tournament wins?/gi, '')
        // Remove "with X tournament wins" phrases
        .replace(/\s*with\s+\d+\s+tournament wins?/gi, '')
        // Remove standalone tournament wins mentions
        .replace(/tournament wins?:?\s*\d+/gi, '')
        // Clean up multiple consecutive newlines (more than 2)
        .replace(/\n{3,}/g, '\n\n')
        // Clean up any trailing spaces on lines
        .replace(/[ \t]+$/gm, '');

      // Only update if content changed
      if (cleanedContent !== originalContent) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({ content_markdown: cleanedContent, updated_at: new Date().toISOString() })
          .eq('id', post.id);

        if (updateError) {
          console.error(`Error updating post ${post.id}:`, updateError);
          results.push({ id: post.id, updated: false, error: updateError.message });
        } else {
          updatedCount++;
          results.push({ id: post.id, updated: true });
          console.log(`Updated post ${post.id}`);
        }
      } else {
        results.push({ id: post.id, updated: false });
      }
    }

    console.log(`Cleanup complete. Updated ${updatedCount} of ${posts?.length || 0} posts`);

    return new Response(JSON.stringify({
      success: true,
      totalPosts: posts?.length || 0,
      updatedPosts: updatedCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cleanup-blog-tournament-stats:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
