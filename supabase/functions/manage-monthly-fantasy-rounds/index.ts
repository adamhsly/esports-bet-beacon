const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Monthly rounds are managed manually - this function is a no-op
Deno.serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('📅 Monthly fantasy rounds are managed manually - skipping auto-creation');

  return new Response(
    JSON.stringify({
      success: true,
      skipped: true,
      reason: 'Monthly rounds are managed manually',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
