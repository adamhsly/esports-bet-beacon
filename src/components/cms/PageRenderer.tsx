import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Page } from '@/types/cms';
import { getPageBySlug } from '@/lib/cms';
import { Skeleton } from '@/components/ui/skeleton';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';

interface PageRendererProps {
  slug: string;
}

export const PageRenderer: React.FC<PageRendererProps> = ({ slug }) => {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('🎯 PageRenderer: Component rendered with slug:', slug);

  useEffect(() => {
    console.log('🎯 PageRenderer: useEffect triggered for slug:', slug);
    
    const fetchPage = async () => {
      console.log('🎯 PageRenderer: fetchPage function called');
      setLoading(true);
      setError(null);
      
      try {
        console.log('🎯 PageRenderer: About to call getPageBySlug with:', slug);
        const pageData = await getPageBySlug(slug);
        console.log('🎯 PageRenderer: getPageBySlug returned:', pageData);
        
        if (pageData) {
          setPage(pageData);
          
          // Set SEO metadata
          document.title = pageData.seo_title || pageData.title;
          
          // Update meta description
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            metaDescription.setAttribute('content', pageData.seo_description || `${pageData.title} - Frags and Fortunes`);
          } else {
            const meta = document.createElement('meta');
            meta.name = 'description';
            meta.content = pageData.seo_description || `${pageData.title} - Frags and Fortunes`;
            document.head.appendChild(meta);
          }
          
          // Add canonical URL
          const canonical = document.querySelector('link[rel="canonical"]');
          if (canonical) {
            canonical.setAttribute('href', window.location.href);
          } else {
            const link = document.createElement('link');
            link.rel = 'canonical';
            link.href = window.location.href;
            document.head.appendChild(link);
          }
        } else {
          console.warn('PageRenderer: No page data found for slug:', slug);
          setError('Page not found');
        }
      } catch (err) {
        console.error('PageRenderer: Error loading page:', err);
        setError('Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SearchableNavbar />
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Skeleton className="h-12 w-3/4 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-background">
        <SearchableNavbar />
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              {error === 'Page not found' ? 'Page Not Found' : 'Error Loading Page'}
            </h1>
            <p className="text-muted-foreground mb-8">
              {error === 'Page not found' 
                ? 'The page you are looking for does not exist.' 
                : 'There was an error loading this page. Please try again later.'}
            </p>
            <a 
              href="/" 
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Go Home
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SearchableNavbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <article className="prose prose-lg prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-white mb-8">{page.title}</h1>
          <div className="text-foreground">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h2 className="text-3xl font-bold mt-8 mb-4 text-white">{children}</h2>,
                h2: ({ children }) => <h3 className="text-2xl font-semibold mt-6 mb-3 text-white">{children}</h3>,
                h3: ({ children }) => <h4 className="text-xl font-medium mt-4 mb-2 text-white">{children}</h4>,
                p: ({ children }) => <p className="mb-4 text-white leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="mb-4 ml-6 list-disc text-white">{children}</ul>,
                ol: ({ children }) => <ol className="mb-4 ml-6 list-decimal text-white">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                a: ({ href, children }) => (
                  <a 
                    href={href} 
                    className="text-blue-400 hover:text-blue-300 underline focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                    target={href?.startsWith('http') ? '_blank' : undefined}
                    rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-white">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto my-4">
                    {children}
                  </pre>
                ),
              }}
            >
              {page.content_markdown}
            </ReactMarkdown>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};