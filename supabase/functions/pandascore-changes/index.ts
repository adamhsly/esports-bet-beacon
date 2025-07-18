import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const PANDA_API_TOKEN = Deno.env.get('PANDA_SCORE_API_KEY')
  const BASE_URL = 'https://api.pandascore.co/changes'
  const PER_PAGE = 50
  const SYNC_ID = 'match_changes'

  const headers = {
    Authorization: `Bearer ${PANDA_API_TOKEN}`,
  }

  // Get last page from sync state
  const { data: syncState, error: syncError } = await supabase
    .from('pandascore_sync_state')
    .select('last_page')
    .eq('id', SYNC_ID)
    .maybeSingle()

  if (syncError) {
    console.error('❌ Failed to fetch sync state:', syncError)
    return new Response('Failed to fetch sync state', { status: 500 })
  }

  let page = (syncState?.last_page ?? 0) + 1

  // Get total pages from headers
  const paramsForTotal = new URLSearchParams({
    type: 'match',
    'page[size]': '1',
  })

  const totalRes = await fetch(`${BASE_URL}?${paramsForTotal.toString()}`, {
    headers,
  })

  const totalPages = parseInt(totalRes.headers.get('X-Total-Pages') ?? '1', 10)
  console.log(`🔢 Total pages: ${totalPages}`)

  // Reset page if over limit
  if (page > totalPages) {
    page = 1
  }

  const params = new URLSearchParams({
    type: 'match',
    'page[size]': PER_PAGE.toString(),
    'page[number]': page.toString(),
  })

  const res = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers,
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('❌ Failed to fetch changes:', errText)
    return new Response(`Failed to fetch changes: ${errText}`, { status: 500 })
  }

  const changes = await res.json()

  console.log(`✅ Fetched page ${page} with ${changes.length} change(s)`)

  // TODO: Add your match update logic here using `changes`

  // Update sync state
  const { error: syncUpdateError } = await supabase
    .from('pandascore_sync_state')
    .upsert(
      {
        id: SYNC_ID,
        last_page: page,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: ['id'] }
    )

  if (syncUpdateError) {
    console.error('❌ Failed to update sync state:', syncUpdateError)
    return new Response('Failed to update sync state', { status: 500 })
  }

  return new Response(JSON.stringify({ status: 'done', page, count: changes.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
