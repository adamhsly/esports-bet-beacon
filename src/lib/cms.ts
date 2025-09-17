import { supabase } from '@/integrations/supabase/client';
import { Page } from '@/types/cms';
import { memoryCache } from '@/utils/cacheUtils';

const CACHE_TTL = 5 * 60; // 5 minutes

export async function getPageBySlug(slug: string): Promise<Page | null> {
  console.log('🔍 CMS: getPageBySlug called with slug:', slug);
  
  const cacheKey = `page:${slug}`;
  
  // Temporarily disable cache for debugging
  console.log('🔍 CMS: Skipping cache, fetching from database');
  
  try {
    console.log('🔍 CMS: Making Supabase query for slug:', slug);
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    console.log('🔍 CMS: Supabase response:', { data, error });

    if (error) {
      console.error('🔍 CMS: Supabase error:', error);
      return null;
    }

    if (data) {
      console.log('🔍 CMS: Found page data:', data);
      // Cache the result (re-enable after debugging)
      // memoryCache.set(cacheKey, data, CACHE_TTL);
      return data;
    } else {
      console.warn('🔍 CMS: No data found for slug:', slug);
      return null;
    }
  } catch (error) {
    console.error('🔍 CMS: Catch block error:', error);
    return null;
  }
}