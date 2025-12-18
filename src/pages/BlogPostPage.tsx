import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { getPostBySlug, getRelatedPosts, estimateReadTime, formatPublishedDate } from '@/lib/blog';
import { BlogPost } from '@/types/blog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Calendar, User, ArrowLeft, Share2, Twitter, Facebook, Linkedin } from 'lucide-react';

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      setLoading(true);
      setError(false);
      
      const postData = await getPostBySlug(slug);
      if (postData) {
        setPost(postData);
        const related = await getRelatedPosts(postData.id, postData.category, 3);
        setRelatedPosts(related);
      } else {
        setError(true);
      }
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = post?.title || '';

  const handleShare = (platform: string) => {
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`,
    };
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SearchableNavbar />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-64 w-full mb-8 rounded-lg" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <SearchableNavbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The blog post you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/blog')} className="bg-theme-purple hover:bg-theme-purple/90">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.seo_description,
    image: post.featured_image_url,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: post.author_name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Frags & Fortunes',
      logo: {
        '@type': 'ImageObject',
        url: 'https://fragsandfortunes.com/lovable-uploads/frags_and_fortunes_transparent.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://fragsandfortunes.com/blog/${post.slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.seo_title || post.title} | Frags & Fortunes Blog</title>
        <meta name="description" content={post.seo_description || post.excerpt || ''} />
        <meta property="og:title" content={post.seo_title || post.title} />
        <meta property="og:description" content={post.seo_description || post.excerpt || ''} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://fragsandfortunes.com/blog/${post.slug}`} />
        {post.featured_image_url && <meta property="og:image" content={post.featured_image_url} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.seo_title || post.title} />
        <meta name="twitter:description" content={post.seo_description || post.excerpt || ''} />
        {post.featured_image_url && <meta name="twitter:image" content={post.featured_image_url} />}
        <link rel="canonical" href={`https://fragsandfortunes.com/blog/${post.slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <SearchableNavbar />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/blog')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
        </Button>

        {/* Featured Image */}
        {post.featured_image_url && (
          <div className="relative h-64 md:h-96 overflow-hidden rounded-lg mb-8">
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            {post.category && (
              <Badge className="absolute top-4 left-4 bg-theme-purple/90 text-lg px-3 py-1">
                {post.category}
              </Badge>
            )}
          </div>
        )}

        {/* Title & Meta */}
        <header className="mb-8">
          {!post.featured_image_url && post.category && (
            <Badge className="mb-4 bg-theme-purple/90">{post.category}</Badge>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {post.author_name}
            </span>
            {post.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatPublishedDate(post.published_at)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {estimateReadTime(post.content_markdown)} min read
            </span>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs text-white border-white/30">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </header>

        {/* Content */}
        <article className="prose prose-invert prose-lg max-w-none mb-12">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4 text-white">{children}</h1>,
              h2: ({ children }) => <h2 className="text-2xl font-bold mt-6 mb-3 text-white">{children}</h2>,
              h3: ({ children }) => <h3 className="text-xl font-semibold mt-5 mb-2 text-white">{children}</h3>,
              p: ({ children }) => <p className="mb-4 text-white leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-6 mb-4 text-white">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 text-white">{children}</ol>,
              li: ({ children }) => <li className="mb-2 text-white">{children}</li>,
              a: ({ href, children }) => (
                <a href={href} className="text-theme-purple hover:underline" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-theme-purple pl-4 italic my-4 text-white/80">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-muted px-2 py-1 rounded text-sm">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
              ),
              img: ({ src, alt }) => (
                <img src={src} alt={alt} className="rounded-lg my-4 w-full" />
              ),
            }}
          >
            {post.content_markdown}
          </ReactMarkdown>
        </article>

        {/* Share Section */}
        <div className="border-t border-border pt-8 mb-12">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Share2 className="w-5 h-5" /> Share this article
          </h3>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => handleShare('twitter')}>
              <Twitter className="w-4 h-4 mr-2" /> Twitter
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleShare('facebook')}>
              <Facebook className="w-4 h-4 mr-2" /> Facebook
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleShare('linkedin')}>
              <Linkedin className="w-4 h-4 mr-2" /> LinkedIn
            </Button>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6 text-white">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relPost) => (
                <Link key={relPost.id} to={`/blog/${relPost.slug}`}>
                  <Card className="overflow-hidden bg-card border-border hover:border-theme-purple/50 transition-all duration-300 h-full group">
                    {relPost.featured_image_url && (
                      <div className="relative h-32 overflow-hidden">
                        <img
                          src={relPost.featured_image_url}
                          alt={relPost.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-white line-clamp-2 group-hover:text-theme-purple transition-colors">
                        {relPost.title}
                      </h3>
                      {relPost.published_at && (
                        <p className="text-xs text-white/70 mt-2">
                          {formatPublishedDate(relPost.published_at)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogPostPage;
