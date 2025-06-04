
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Processing welcome pack for user: ${user_id}`)

    // Check if user already received welcome pack
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('welcome_pack_claimed')
      .eq('id', user_id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch user profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (profile.welcome_pack_claimed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Welcome pack already claimed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get starter pack configuration
    const { data: starterPack, error: packError } = await supabaseClient
      .from('starter_pack_config')
      .select('*')
      .eq('is_active', true)
      .eq('game', 'cs2')
      .single()

    if (packError || !starterPack) {
      console.error('Error fetching starter pack config:', packError)
      return new Response(
        JSON.stringify({ success: false, error: 'No active starter pack found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const playerList = starterPack.player_list as any[]
    const generatedCards: any[] = []

    // Generate cards for each player in the starter pack
    for (const player of playerList) {
      try {
        console.log(`Generating card for player: ${player.player_name}`)
        
        // Call the generate-player-cards function
        const { data: cardResponse, error: cardError } = await supabaseClient.functions.invoke(
          'generate-player-cards',
          {
            body: { 
              player_id: player.player_id,
              force_rarity: 'common'
            }
          }
        )

        if (cardError) {
          console.error(`Error generating card for ${player.player_name}:`, cardError)
          continue
        }

        if (cardResponse?.success && cardResponse?.card) {
          generatedCards.push(cardResponse.card)
          
          // Add card to user's collection
          await supabaseClient
            .from('user_card_collections')
            .insert({
              user_id: user_id,
              card_id: cardResponse.card.id,
              acquired_method: 'welcome_pack',
              quantity: 1
            })
        }
      } catch (error) {
        console.error(`Failed to generate card for ${player.player_name}:`, error)
        continue
      }
    }

    if (generatedCards.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate any cards' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Mark welcome pack as claimed
    await supabaseClient
      .from('profiles')
      .update({ welcome_pack_claimed: true })
      .eq('id', user_id)

    // Create pack purchase record
    await supabaseClient
      .from('pack_purchases')
      .insert({
        user_id: user_id,
        pack_type: 'welcome',
        pack_price: 0,
        payment_method: 'free',
        is_opened: true,
        opened_at: new Date().toISOString(),
        cards_received: generatedCards.map(card => card.id)
      })

    console.log(`Successfully generated ${generatedCards.length} cards for welcome pack`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        cards_generated: generatedCards.length,
        cards: generatedCards,
        pack_name: starterPack.pack_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in welcome-starter-pack function:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
