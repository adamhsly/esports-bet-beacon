import { supabase } from '@/integrations/supabase/client';
import { Page } from '@/types/cms';
// keep cache import if you’ll re-enable later
// import { memoryCache } from '@/utils/cacheUtils';

const CACHE_TTL = 5 * 60; // 5 minutes

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const normalized = slug.trim().toLowerCase();
  console.log('🔍 CMS:getPageBySlug slug(raw→norm):', slug, '→', normalized);

  // 🔎 Visibility probe: does the current role see ANY row for this slug?
  const { count, error: countErr } = await supabase
    .from('pages')
    .select('id', { head: true, count: 'exact' })
    .eq('slug', normalized);

  console.log('🔎 visible row count for', normalized, '→', count, countErr);

  // ⚠️ Skip cache while debugging
  console.log('🔍 CMS: Skipping cache, fetching from database');

  try {
    console.log('🔍 CMS: Making Supabase query for slug:', normalized);
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', normalized)
      .maybeSingle();

    console.log('🔍 CMS: Supabase response:', { data, error });

    if (error) {
      console.error('🔍 CMS: Supabase error:', error);
      return null;
    }

    if (!data) {
      console.warn('🔍 CMS: No data found for slug:', normalized, '(env mismatch or RLS/privileges likely)');
      return null;
    }

    console.log('✅ CMS: Found page data:', { id: data.id, slug: data.slug, title: (data as any).title });
    // memoryCache.set(`page:${normalized}`, data, CACHE_TTL); // re-enable after debug
    return data as Page;
  } catch (err) {
    console.error('🔍 CMS: Catch block error:', err);
    return null;
  }
}
