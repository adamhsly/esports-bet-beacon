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
    <div className="min-h-screen bg-background">
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

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-theme-purple">Frags & Fortunes</span>{' '}
            <span className="text-white">Blog</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Esports insights, fantasy strategies, and gaming guides to help you dominate the leaderboards.
          </p>
        </section>

        {/* Category Filter */}
        <section className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant={selectedCategory === 'All' ? 'default' : 'outline'}
              onClick={() => handleCategoryChange('All')}
              className={selectedCategory === 'All' ? 'bg-theme-purple hover:bg-theme-purple/90' : ''}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.name}
                variant={selectedCategory === cat.name ? 'default' : 'outline'}
                onClick={() => handleCategoryChange(cat.name)}
                className={selectedCategory === cat.name ? 'bg-theme-purple hover:bg-theme-purple/90' : ''}
              >
                {cat.name} ({cat.count})
              </Button>
            ))}
          </div>
        </section>

        {/* Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden bg-card border-border">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No blog posts found.</p>
            <p className="text-sm text-muted-foreground mt-2">Check back soon for new content!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="overflow-hidden bg-card border-border hover:border-theme-purple/50 transition-all duration-300 h-full group">
                  {post.featured_image_url && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={post.featured_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {post.category && (
                        <Badge className="absolute top-3 left-3 bg-theme-purple/90">
                          {post.category}
                        </Badge>
                      )}
                    </div>
                  )}
                  <CardContent className="p-4">
                    {!post.featured_image_url && post.category && (
                      <Badge className="mb-2 bg-theme-purple/90">{post.category}</Badge>
                    )}
                    <h2 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-theme-purple transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BlogPage;
