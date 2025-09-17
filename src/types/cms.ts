export interface Page {
  id: string;
  slug: string;
  title: string;
  content_markdown: string;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}