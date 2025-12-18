import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { getAllPosts, getCategories, estimateReadTime, formatPublishedDate } from '@/lib/blog';
import { BlogPost, BlogCategory } from '@/types/blog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const POSTS_PER_PAGE = 12;

const BlogPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [postsResult, categoriesResult] = await Promise.all([
        getAllPosts(currentPage, selectedCategory),
        getCategories(),
      ]);
      setPosts(postsResult.posts);
      setTotalPosts(postsResult.total);
      setCategories(categoriesResult);
      setLoading(false);
    };
    fetchData();
  }, [currentPage, selectedCategory]);

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Frags & Fortunes Blog',
    description: 'Esports news, fantasy tips, and gaming guides',
    url: 'https://fragsandfortunes.com/blog',
    publisher: {
      '@type': 'Organization',
      name: 'Frags & Fortunes',
      logo: {
        '@type': 'ImageObject',
        url: 'https://fragsandfortunes.com/lovable-uploads/frags_and_fortunes_transparent.png',
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-theme-gray-dark theme-alt-card">
      <Helmet>
        <title>Blog | Frags & Fortunes - Esports Fantasy News & Guides</title>
        <meta
          name="description"
          content="Stay updated with the latest esports news, fantasy tips, CS2 guides, Valorant strategies, and more. Expert insights from the Frags & Fortunes team."
        />
        <meta property="og:title" content="Frags & Fortunes Blog - Esports Fantasy News & Guides" />
        <meta
          property="og:description"
          content="Stay updated with the latest esports news, fantasy tips, and gaming guides."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fragsandfortunes.com/blog" />
        <link rel="canonical" href="https://fragsandfortunes.com/blog" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <SearchableNavbar />

      <div className="flex-grow w-full">
        <div className="mx-2 md:mx-4 my-8">
          {/* Hero Section */}
          <section className="text-center mb-8 max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-theme-purple">Frags</span>{' '}
              <span className="text-yellow-400">&</span>{' '}
              <span className="text-white">Fortunes Blog</span>
            </h1>
            <p className="text-lg text-[#d1d1d9] max-w-2xl mx-auto">
              Esports insights, fantasy strategies, and gaming guides to help you dominate the leaderboards.
            </p>
          </section>

          <div className="max-w-4xl mx-auto">
            {/* Category Filter */}
            <section className="mb-8">
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => handleCategoryChange('All')}
                  className={`py-2.5 px-4 rounded-lg font-medium transition-all duration-250 ${
                    selectedCategory === 'All'
                      ? 'bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white shadow-[0_0_12px_rgba(122,92,255,0.4)] font-semibold'
                      : 'text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:text-white'
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => handleCategoryChange(cat.name)}
                    className={`py-2.5 px-4 rounded-lg font-medium transition-all duration-250 ${
                      selectedCategory === cat.name
                        ? 'bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white shadow-[0_0_12px_rgba(122,92,255,0.4)] font-semibold'
                        : 'text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:text-white'
                    }`}
                  >
                    {cat.name} ({cat.count})
                  </button>
                ))}
              </div>
            </section>

            {/* Posts Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] border-white/[0.05]">
                    <Skeleton className="h-48 w-full bg-white/[0.04]" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-4 w-20 bg-white/[0.04]" />
                      <Skeleton className="h-6 w-full bg-white/[0.04]" />
                      <Skeleton className="h-4 w-full bg-white/[0.04]" />
                      <Skeleton className="h-4 w-2/3 bg-white/[0.04]" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[#d1d1d9] text-lg">No blog posts found.</p>
                <p className="text-sm text-[#d1d1d9]/70 mt-2">Check back soon for new content!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <Link key={post.id} to={`/blog/${post.slug}`}>
                    <Card className="overflow-hidden bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] border-white/[0.05] hover:border-[#7a5cff]/50 transition-all duration-300 h-full group">
                      {post.featured_image_url && (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={post.featured_image_url}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {post.category && (
                            <Badge className="absolute top-3 left-3 bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white border-0">
                              {post.category}
                            </Badge>
                          )}
                        </div>
                      )}
                      <CardContent className="p-4">
                        {!post.featured_image_url && post.category && (
                          <Badge className="mb-2 bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white border-0">
                            {post.category}
                          </Badge>
                        )}
                        <h2 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-[#8e6fff] transition-colors">
                          {post.title}
                        </h2>
                        {post.excerpt && (
                          <p className="text-[#d1d1d9] text-sm line-clamp-3 mb-4">
                            {post.excerpt}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-[#d1d1d9]/70">
                          {post.published_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatPublishedDate(post.published_at)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {estimateReadTime(post.content_markdown)} min read
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="py-2.5 px-4 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:text-white transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </button>
                <span className="text-sm text-[#d1d1d9]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="py-2.5 px-4 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:text-white transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogPage;
