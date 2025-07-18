import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const PANDA_API_TOKEN = Deno.env.get('PANDA_SCORE_API_KEY')
  const BASE_URL = 'https://api.pandascore.co/changes'
  const PAGE_SIZE = 50

  const headers = {
    Authorization: `Bearer ${PANDA_API_TOKEN}`,
  }

  // Get current sync state
  const { data: syncState, error: syncError } = await supabase
    .from('pandascore_sync_state')
    .select('last_page, max_page')
    .eq('id', 'match_changes')
    .maybeSingle()

  if (syncError) {
    console.error('❌ Failed to fetch sync state:', syncError)
    return new Response('Failed to fetch sync state', { status: 500 })
  }

  let currentPage = (syncState?.last_page ?? 0) + 1
  let maxPage = syncState?.max_page ?? null

  console.log(`🔁 Starting from page ${currentPage} (max page: ${maxPage ?? 'unknown'})`)

  // Fetch current page of changes
  const url = `${BASE_URL}?type=match&page[size]=${PAGE_SIZE}&page[number]=${currentPage}`

  const res = await fetch(url, { headers })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('❌ Failed to fetch changes:', errorText)
    return new Response(`Failed to fetch changes: ${errorText}`, { status: 500 })
  }

  const changes = await res.json()

  // Handle empty or unexpected response
  if (!Array.isArray(changes) || changes.length === 0) {
    console.log(`ℹ️ No changes returned on page ${currentPage}.`)
    return new Response(JSON.stringify({ status: 'done', message: 'No changes on page' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // TODO: Process match changes here
  console.log(`✅ Received ${changes.length} match changes on page ${currentPage}`)

  // Extract new max page from headers
  const totalHeader = res.headers.get('X-Total')
  const newMaxPage = totalHeader ? Math.ceil(parseInt(totalHeader) / PAGE_SIZE) : maxPage

  // Reset page count if we've reached or passed the last page
  let nextPage = currentPage >= newMaxPage ? 1 : currentPage

  // Update sync state
  const { error: updateError } = await supabase
    .from('pandascore_sync_state')
    .upsert({
      id: 'match_changes',
      last_page: nextPage,
      max_page: newMaxPage,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: ['id'] })

  if (updateError) {
    console.error('❌ Failed to update sync state:', updateError)
    return new Response('Failed to update sync state', { status: 500 })
  }

  return new Response(
    JSON.stringify({
      status: 'success',
      currentPage,
      nextPage,
      newMaxPage,
      changeCount: changes.length,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
