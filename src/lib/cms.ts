import { supabase } from '@/integrations/supabase/client';
import { Page } from '@/types/cms';
import { memoryCache } from '@/utils/cacheUtils';

const CACHE_TTL = 5 * 60; // 5 minutes

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const cacheKey = `page:${slug}`;
  
  // Check cache first
  const cachedPage = memoryCache.get<Page>(cacheKey);
  if (cachedPage) {
    return cachedPage;
  }

  try {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error('Error fetching page:', error);
      return null;
    }

    if (data) {
      // Cache the result
      memoryCache.set(cacheKey, data, CACHE_TTL);
    }

    return data;
  } catch (error) {
    console.error('Error fetching page:', error);
    return null;
  }
}