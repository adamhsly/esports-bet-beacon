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
import { Clock, Calendar, User, ArrowLeft, Share2, Twitter, Facebook, Linkedin, ChevronRight } from 'lucide-react';

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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <Skeleton className="h-6 w-24 mb-8" />
          <Skeleton className="h-[300px] md:h-[450px] w-full mb-8 rounded-2xl" />
          <Skeleton className="h-10 md:h-14 w-3/4 mb-4" />
          <div className="flex gap-4 mb-8">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
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
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 rounded-2xl p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">Post Not Found</h1>
            <p className="text-muted-foreground mb-8 text-lg">
              The blog post you're looking for doesn't exist or has been removed.
            </p>
            <Button 
              onClick={() => navigate('/blog')} 
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white px-6 py-3"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
            </Button>
          </div>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 md:mb-8">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/blog" className="hover:text-white transition-colors">Blog</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white/70 truncate max-w-[200px]">{post.title}</span>
        </nav>

        {/* Featured Image */}
        {post.featured_image_url && (
          <div className="relative aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-2xl mb-8 md:mb-10 shadow-2xl shadow-purple-500/10">
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            {post.category && (
              <Badge className="absolute top-4 left-4 bg-purple-600/90 backdrop-blur-sm text-white text-sm px-4 py-1.5 font-medium">
                {post.category}
              </Badge>
            )}
          </div>
        )}

        {/* Title & Meta */}
        <header className="mb-8 md:mb-12">
          {!post.featured_image_url && post.category && (
            <Badge className="mb-4 bg-purple-600/90 text-white">{post.category}</Badge>
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            {post.title}
          </h1>
          
          {/* Author & Meta Info */}
          <div className="flex flex-wrap items-center gap-3 md:gap-6 text-sm md:text-base">
            <div className="flex items-center gap-2 text-white/80">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">{post.author_name}</span>
            </div>
            {post.published_at && (
              <div className="flex items-center gap-2 text-white/60">
                <Calendar className="w-4 h-4" />
                <span>{formatPublishedDate(post.published_at)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-white/60">
              <Clock className="w-4 h-4" />
              <span>{estimateReadTime(post.content_markdown)} min read</span>
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {post.tags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-xs md:text-sm text-white/70 border-white/20 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </header>

        {/* Content */}
        <article className="blog-content mb-12 md:mb-16">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl md:text-3xl font-bold mt-10 md:mt-14 mb-4 md:mb-6 text-white border-b border-white/10 pb-4">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl md:text-2xl font-bold mt-8 md:mt-12 mb-3 md:mb-4 text-white flex items-center gap-3">
                  <span className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-700 rounded-full" />
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg md:text-xl font-semibold mt-6 md:mt-8 mb-2 md:mb-3 text-white/95">
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-base md:text-lg font-semibold mt-4 md:mt-6 mb-2 text-white/90">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="mb-4 md:mb-5 text-white/80 leading-relaxed text-base md:text-lg">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-none pl-0 mb-5 md:mb-6 space-y-2 md:space-y-3">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-5 md:mb-6 space-y-2 md:space-y-3 text-white/80 text-base md:text-lg marker:text-purple-400">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-white/80 text-base md:text-lg flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  <span>{children}</span>
                </li>
              ),
              a: ({ href, children }) => (
                <a 
                  href={href} 
                  className="text-purple-400 hover:text-purple-300 underline underline-offset-4 decoration-purple-400/30 hover:decoration-purple-300 transition-colors" 
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-purple-500 bg-purple-500/10 rounded-r-lg pl-5 pr-4 py-4 my-6 md:my-8">
                  <div className="text-white/90 italic text-base md:text-lg">{children}</div>
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-white/10 text-purple-300 px-2 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-slate-900/80 border border-white/10 p-4 md:p-6 rounded-xl overflow-x-auto mb-5 md:mb-6 text-sm">
                  {children}
                </pre>
              ),
              img: ({ src, alt }) => (
                <figure className="my-6 md:my-8">
                  <img 
                    src={src} 
                    alt={alt} 
                    className="rounded-xl w-full shadow-lg shadow-black/20" 
                  />
                  {alt && (
                    <figcaption className="text-center text-sm text-white/50 mt-3">
                      {alt}
                    </figcaption>
                  )}
                </figure>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-6 md:my-8 rounded-xl border border-white/10">
                  <table className="w-full text-sm md:text-base">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-purple-500/20 text-white">
                  {children}
                </thead>
              ),
              th: ({ children }) => (
                <th className="px-4 py-3 text-left font-semibold border-b border-white/10">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-3 text-white/80 border-b border-white/5">
                  {children}
                </td>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-white/5 transition-colors">
                  {children}
                </tr>
              ),
              hr: () => (
                <hr className="my-8 md:my-12 border-none h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-white">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-white/90">{children}</em>
              ),
            }}
          >
            {post.content_markdown}
          </ReactMarkdown>
        </article>

        {/* Share Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 rounded-2xl p-6 md:p-8 mb-12 md:mb-16">
          <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-3 text-white">
            <Share2 className="w-5 h-5 text-purple-400" /> 
            Share this article
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              size="default" 
              className="bg-white/5 border-white/10 text-white hover:bg-[#1DA1F2]/20 hover:border-[#1DA1F2]/50 hover:text-[#1DA1F2] transition-all" 
              onClick={() => handleShare('twitter')}
            >
              <Twitter className="w-4 h-4 mr-2" /> Twitter
            </Button>
            <Button 
              variant="outline" 
              size="default" 
              className="bg-white/5 border-white/10 text-white hover:bg-[#4267B2]/20 hover:border-[#4267B2]/50 hover:text-[#4267B2] transition-all" 
              onClick={() => handleShare('facebook')}
            >
              <Facebook className="w-4 h-4 mr-2" /> Facebook
            </Button>
            <Button 
              variant="outline" 
              size="default" 
              className="bg-white/5 border-white/10 text-white hover:bg-[#0077B5]/20 hover:border-[#0077B5]/50 hover:text-[#0077B5] transition-all" 
              onClick={() => handleShare('linkedin')}
            >
              <Linkedin className="w-4 h-4 mr-2" /> LinkedIn
            </Button>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-white flex items-center gap-3">
              <span className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-700 rounded-full" />
              Related Articles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {relatedPosts.map((relPost) => (
                <Link key={relPost.id} to={`/blog/${relPost.slug}`}>
                  <Card className="relative cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10 overflow-hidden bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-white/10 hover:border-purple-500/40 h-full group">
                    {relPost.featured_image_url && (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img
                          src={relPost.featured_image_url}
                          alt={relPost.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                      </div>
                    )}
                    <CardContent className="p-4 md:p-5">
                      <h3 className="font-semibold text-white line-clamp-2 group-hover:text-purple-400 transition-colors text-base md:text-lg leading-tight">
                        {relPost.title}
                      </h3>
                      {relPost.published_at && (
                        <p className="text-xs md:text-sm text-white/50 mt-2 flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
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

        {/* Back to Blog CTA */}
        <div className="text-center pt-8 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => navigate('/blog')}
            className="bg-white/5 border-white/20 text-white hover:bg-purple-500/20 hover:border-purple-500/40 hover:text-purple-300 transition-all px-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> View All Articles
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPostPage;
