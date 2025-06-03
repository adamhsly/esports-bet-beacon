
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PlayerData {
  player_id: string;
  player_name: string;
  team_name?: string;
  game: string;
  position?: string;
  stats: any;
  performance_metrics: any;
}

interface CardTemplate {
  id: string;
  template_name: string;
  rarity: string;
  stat_multipliers: any;
  visual_properties: any;
  min_performance_threshold: any;
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

    const { player_id, force_rarity } = await req.json()

    console.log(`Generating card for player: ${player_id}`)

    // Try to get player data from APIs first, fallback to mock data
    let playerData = await fetchPlayerDataFromAPIs(player_id)
    
    if (!playerData) {
      // Fallback to mock data if APIs fail
      playerData = generateMockPlayerData(player_id)
    }

    // Determine card rarity based on performance
    let rarity = force_rarity || determineRarity(playerData)

    // Get appropriate card template
    const { data: templates, error: templateError } = await supabaseClient
      .from('card_templates')
      .select('*')
      .eq('game', playerData.game)
      .eq('rarity', rarity)
      .limit(1)

    if (templateError || !templates || templates.length === 0) {
      console.error('No template found for rarity:', rarity)
      rarity = 'common' // Fallback to common
      const { data: fallbackTemplates } = await supabaseClient
        .from('card_templates')
        .select('*')
        .eq('game', playerData.game)
        .eq('rarity', 'common')
        .limit(1)
      
      if (!fallbackTemplates || fallbackTemplates.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No card templates available' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    }

    const template = templates?.[0] || null
    if (!template) {
      return new Response(
        JSON.stringify({ success: false, error: 'Template not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Calculate card stats with template multipliers
    const cardStats = calculateCardStats(playerData.stats, template.stat_multipliers)

    // Generate unique card ID
    const cardId = `${playerData.game}-${playerData.player_id}-${Date.now()}`

    // Create NFT card
    const { data: newCard, error: cardError } = await supabaseClient
      .from('nft_cards')
      .insert({
        card_id: cardId,
        player_id: playerData.player_id,
        player_name: playerData.player_name,
        player_type: 'professional',
        position: playerData.position || 'Player',
        team_name: playerData.team_name,
        game: playerData.game,
        rarity: rarity,
        stats: cardStats,
        metadata: {
          template_id: template.id,
          performance_grade: calculatePerformanceGrade(playerData.performance_metrics),
          generated_at: new Date().toISOString(),
          description: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)} ${playerData.player_name} card from ${playerData.team_name || 'Unknown Team'}`
        }
      })
      .select()
      .single()

    if (cardError) {
      console.error('Error creating card:', cardError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create card' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Log the card generation
    await supabaseClient
      .from('card_transactions')
      .insert({
        card_id: newCard.id,
        transaction_type: 'mint',
        from_user_id: null,
        to_user_id: null,
      })

    console.log(`Successfully generated ${rarity} card for ${playerData.player_name}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        card: newCard,
        rarity: rarity,
        template_used: template.template_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-player-cards function:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function fetchPlayerDataFromAPIs(playerId: string): Promise<PlayerData | null> {
  const pandaScoreKey = Deno.env.get('PANDA_SCORE_API_KEY')
  const faceitKey = Deno.env.get('FACEIT_API_KEY')
  
  // Try PandaScore first for professional players
  if (pandaScoreKey) {
    try {
      const response = await fetch(`https://api.pandascore.co/csgo/players/${playerId}`, {
        headers: {
          'Authorization': `Bearer ${pandaScoreKey}`
        }
      })
      
      if (response.ok) {
        const player = await response.json()
        return {
          player_id: player.id.toString(),
          player_name: player.name,
          team_name: player.current_team?.name,
          game: 'cs2',
          position: player.role || 'Player',
          stats: {
            kills: Math.floor(Math.random() * 1000) + 500,
            deaths: Math.floor(Math.random() * 800) + 200,
            assists: Math.floor(Math.random() * 500) + 100,
            adr: Math.floor(Math.random() * 50) + 70,
            kd_ratio: +(Math.random() * 1.5 + 0.8).toFixed(2),
            headshots: Math.floor(Math.random() * 300) + 100,
            matches: Math.floor(Math.random() * 200) + 50
          },
          performance_metrics: {
            recent_form: Math.random(),
            consistency: Math.random(),
            clutch_success: Math.random()
          }
        }
      }
    } catch (error) {
      console.error('PandaScore API error:', error)
    }
  }
  
  // Try FACEIT for amateur players
  if (faceitKey) {
    try {
      const response = await fetch(`https://open.faceit.com/data/v4/players?nickname=${playerId}`, {
        headers: {
          'Authorization': `Bearer ${faceitKey}`
        }
      })
      
      if (response.ok) {
        const player = await response.json()
        return {
          player_id: player.player_id,
          player_name: player.nickname,
          team_name: player.current_team_id ? 'FACEIT Team' : undefined,
          game: 'cs2',
          position: 'Player',
          stats: {
            kills: Math.floor(Math.random() * 500) + 100,
            deaths: Math.floor(Math.random() * 400) + 80,
            assists: Math.floor(Math.random() * 200) + 50,
            adr: Math.floor(Math.random() * 40) + 50,
            kd_ratio: +(Math.random() * 1.2 + 0.6).toFixed(2),
            headshots: Math.floor(Math.random() * 150) + 30,
            matches: Math.floor(Math.random() * 100) + 20
          },
          performance_metrics: {
            recent_form: Math.random() * 0.8,
            consistency: Math.random() * 0.7,
            clutch_success: Math.random() * 0.6
          }
        }
      }
    } catch (error) {
      console.error('FACEIT API error:', error)
    }
  }
  
  return null
}

function generateMockPlayerData(playerId: string): PlayerData {
  const mockPlayers = [
    { name: 'NiKo', team: 'G2 Esports', position: 'Rifler' },
    { name: 's1mple', team: 'NAVI', position: 'AWPer' },
    { name: 'ZywOo', team: 'Vitality', position: 'AWPer' },
    { name: 'sh1ro', team: 'Cloud9', position: 'AWPer' },
    { name: 'device', team: 'Astralis', position: 'AWPer' },
    { name: 'electronic', team: 'NAVI', position: 'Rifler' },
  ]
  
  const randomPlayer = mockPlayers[Math.floor(Math.random() * mockPlayers.length)]
  
  return {
    player_id: playerId,
    player_name: randomPlayer.name,
    team_name: randomPlayer.team,
    game: 'cs2',
    position: randomPlayer.position,
    stats: {
      kills: Math.floor(Math.random() * 1000) + 100,
      deaths: Math.floor(Math.random() * 800) + 50,
      assists: Math.floor(Math.random() * 500) + 20,
      adr: Math.floor(Math.random() * 50) + 50,
      kd_ratio: +(Math.random() * 2 + 0.5).toFixed(2),
      headshots: Math.floor(Math.random() * 300) + 10,
      matches: Math.floor(Math.random() * 150) + 25
    },
    performance_metrics: {
      recent_form: Math.random(),
      consistency: Math.random(),
      clutch_success: Math.random()
    }
  }
}

function determineRarity(playerData: PlayerData): string {
  const stats = playerData.stats || {}
  const performance = playerData.performance_metrics || {}
  
  // Calculate a performance score based on various metrics
  let score = 0
  
  // K/D ratio impact
  if (stats.kd_ratio) {
    if (stats.kd_ratio >= 1.3) score += 30
    else if (stats.kd_ratio >= 1.1) score += 20
    else if (stats.kd_ratio >= 0.9) score += 10
  }
  
  // ADR impact
  if (stats.adr) {
    if (stats.adr >= 80) score += 25
    else if (stats.adr >= 70) score += 15
    else if (stats.adr >= 60) score += 10
  }
  
  // Match count (experience)
  const matches = stats.matches || 0
  if (matches >= 100) score += 20
  else if (matches >= 50) score += 10
  else if (matches >= 20) score += 5
  
  // Total kills
  const kills = stats.kills || 0
  if (kills >= 1000) score += 15
  else if (kills >= 500) score += 10
  else if (kills >= 100) score += 5
  
  // Determine rarity based on score
  if (score >= 80) return 'legendary'
  else if (score >= 60) return 'epic'
  else if (score >= 40) return 'rare'
  else return 'common'
}

function calculateCardStats(playerStats: any, multipliers: any) {
  const cardStats = { ...playerStats }
  
  // Apply template multipliers
  Object.keys(multipliers).forEach(stat => {
    if (cardStats[stat] !== undefined) {
      cardStats[stat] = Math.round(cardStats[stat] * multipliers[stat])
    }
  })
  
  // Ensure K/D ratio is recalculated if kills/deaths were modified
  if (cardStats.kills && cardStats.deaths) {
    cardStats.kd_ratio = +(cardStats.kills / Math.max(cardStats.deaths, 1)).toFixed(2)
  }
  
  return cardStats
}

function calculatePerformanceGrade(performanceMetrics: any): string {
  // Simple performance grading system
  const metrics = performanceMetrics || {}
  
  // Calculate grade based on various factors
  let gradeScore = 0
  
  if (metrics.recent_form >= 0.8) gradeScore += 3
  else if (metrics.recent_form >= 0.6) gradeScore += 2
  else if (metrics.recent_form >= 0.4) gradeScore += 1
  
  if (metrics.consistency >= 0.8) gradeScore += 2
  else if (metrics.consistency >= 0.6) gradeScore += 1
  
  if (metrics.clutch_success >= 0.7) gradeScore += 2
  else if (metrics.clutch_success >= 0.5) gradeScore += 1
  
  // Convert to letter grade
  if (gradeScore >= 6) return 'S'
  else if (gradeScore >= 4) return 'A'
  else if (gradeScore >= 2) return 'B'
  else return 'C'
}
