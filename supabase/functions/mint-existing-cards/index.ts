
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, card_ids, wallet_address } = await req.json()

    if (!user_id || !card_ids || !wallet_address) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Minting ${card_ids.length} cards for user: ${user_id}`)

    // Verify user owns all the cards and they're not already minted
    const { data: userCards, error: cardsError } = await supabaseClient
      .from('user_card_collections')
      .select('card_id, is_minted')
      .eq('user_id', user_id)
      .in('card_id', card_ids)

    if (cardsError) {
      console.error('Error fetching user cards:', cardsError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify card ownership' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const ownedCardIds = userCards?.map(card => card.card_id) || []
    const alreadyMinted = userCards?.filter(card => card.is_minted).map(card => card.card_id) || []

    if (ownedCardIds.length !== card_ids.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'User does not own all specified cards' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (alreadyMinted.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Some cards are already minted',
          already_minted: alreadyMinted
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create minting request
    const { data: mintingRequest, error: requestError } = await supabaseClient
      .from('card_minting_requests')
      .insert({
        user_id: user_id,
        card_ids: card_ids,
        wallet_address: wallet_address,
        request_status: 'pending'
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating minting request:', requestError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create minting request' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Update card collection minting status
    await supabaseClient
      .from('user_card_collections')
      .update({ 
        mint_status: 'minting'
      })
      .eq('user_id', user_id)
      .in('card_id', card_ids)

    // Update card blockchain status
    await supabaseClient
      .from('nft_cards')
      .update({ 
        blockchain_status: 'minting'
      })
      .in('id', card_ids)

    // TODO: Implement actual NFT minting logic here
    // This would integrate with Immutable SDK to mint NFTs
    // For now, we'll simulate the process

    console.log('Minting request created successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        minting_request_id: mintingRequest.id,
        cards_queued: card_ids.length,
        message: 'Cards queued for minting. You will be notified when minting is complete.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in mint-existing-cards function:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
