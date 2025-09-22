// lib/supabaseMatchFunctions.ts
import { supabase } from './supabaseClient'

// Fetch day counts for a window around target date
export async function getDayCounts(targetDate: Date, windowDays: number = 7) {
  const dateStr = targetDate.toISOString().slice(0, 10) // 'YYYY-MM-DD'

  const { data, error } = await supabase
    .from('daily_match_counts')
    .select('*')
    .gte('match_date', new Date(new Date(dateStr).getTime() - windowDays * 86400000).toISOString().slice(0, 10))
    .lt('match_date', new Date(new Date(dateStr).getTime() + (windowDays + 1) * 86400000).toISOString().slice(0, 10))
    .order('match_date', { ascending: true })
    .order('source', { ascending: true })

  if (error) {
    console.error('❌ getDayCounts error:', error)
    throw error
  }

  return data || []
}
