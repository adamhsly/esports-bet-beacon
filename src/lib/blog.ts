import { supabase } from '@/integrations/supabase/client';
import { BlogPost, BlogCategory } from '@/types/blog';

const POSTS_PER_PAGE = 12;

export async function getAllPosts(
  page: number = 1,
  category?: string
): Promise<{ posts: BlogPost[]; total: number }> {
  const from = (page - 1) * POSTS_PER_PAGE;
  const to = from + POSTS_PER_PAGE - 1;

  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .range(from, to);

  if (category && category !== 'All') {
    query = query.eq('category', category);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching blog posts:', error);
    return { posts: [], total: 0 };
  }

  return { posts: (data as BlogPost[]) || [], total: count || 0 };
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }

  return data as BlogPost | null;
}

export async function getRelatedPosts(
  currentPostId: string,
  category: string | null,
  limit: number = 3
): Promise<BlogPost[]> {
  let query = supabase
    .from('blog_posts')
    .select('*')
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString())
    .neq('id', currentPostId)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching related posts:', error);
    return [];
  }

  return (data as BlogPost[]) || [];
}

export async function getCategories(): Promise<BlogCategory[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('category')
    .eq('is_published', true)
    .lte('published_at', new Date().toISOString());

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  const categoryCounts: Record<string, number> = {};
  data?.forEach((post) => {
    const cat = post.category || 'Uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function estimateReadTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

export function formatPublishedDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
