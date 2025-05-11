
import React, { useEffect, useState } from 'react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import NewsCard, { NewsItemProps } from '@/components/NewsCard';
import { fetchNews } from '@/lib/sportDevsApi';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const NewsPage: React.FC = () => {
  const [news, setNews] = useState<NewsItemProps[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    async function loadNews() {
      try {
        const newsData = await fetchNews(20);
        
        // Transform the API response to our NewsItemProps format
        const formattedNews: NewsItemProps[] = newsData.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          title: item.title || 'News Title Missing',
          summary: item.summary || item.content?.substring(0, 250) || 'No content available',
          imageUrl: item.image_url || '/placeholder.svg',
          date: item.published_at || new Date().toISOString(),
          source: item.source || 'Esports News',
          url: item.url || '#',
          categories: item.categories || ['General']
        }));
        
        setNews(formattedNews);
      } catch (error) {
        console.error('Error loading news:', error);
        toast({
          title: "Error loading news",
          description: "Could not fetch the latest news. Please try again later.",
          variant: "destructive",
        });
        
        // Generate sample news if API fails
        generateSampleNews();
      } finally {
        setLoading(false);
      }
    }
    
    loadNews();
  }, [toast]);
  
  const generateSampleNews = () => {
    const sampleNews: NewsItemProps[] = [
      {
        id: '1',
        title: 'Team Liquid Signs New Valorant Roster',
        summary: 'Team Liquid has announced a complete overhaul of their Valorant roster, signing five new players ahead of the VCT 2024 season.',
        imageUrl: '/placeholder.svg',
        date: new Date().toISOString(),
        source: 'Esports Insider',
        url: '#',
        categories: ['Valorant']
      },
      {
        id: '2',
        title: 'CS:GO Major Championship Breaks Viewership Records',
        summary: 'The latest CS:GO Major championship has shattered previous viewership records with over 2 million concurrent viewers during the grand finals.',
        imageUrl: '/placeholder.svg',
        date: new Date().toISOString(),
        source: 'HLTV',
        url: '#',
        categories: ['CS:GO']
      },
      {
        id: '3',
        title: 'League of Legends World Championship Coming to London in 2025',
        summary: 'Riot Games has announced that the 2025 League of Legends World Championship will be held in London, marking the event\'s return to Europe.',
        imageUrl: '/placeholder.svg',
        date: new Date().toISOString(),
        source: 'Dot Esports',
        url: '#',
        categories: ['League of Legends']
      },
      {
        id: '4',
        title: 'New Dota 2 Update Introduces Major Gameplay Changes',
        summary: 'Valve has released a significant update for Dota 2, introducing new heroes, map changes, and item reworks that will drastically shift the meta.',
        imageUrl: '/placeholder.svg',
        date: new Date().toISOString(),
        source: 'PC Gamer',
        url: '#',
        categories: ['Dota 2']
      },
      {
        id: '5',
        title: 'ESL Announces New Tournament Circuit with $5 Million Prize Pool',
        summary: 'ESL has unveiled a new global tournament circuit featuring competitions across multiple game titles and a combined prize pool of $5 million.',
        imageUrl: '/placeholder.svg',
        date: new Date().toISOString(),
        source: 'ESL Gaming',
        url: '#',
        categories: ['Multiple Games']
      },
      {
        id: '6',
        title: 'Professional Player Retires After Decade-Long Career',
        summary: 'After ten years of competitive play, one of the most iconic players in esports history has announced their retirement from professional gaming.',
        imageUrl: '/placeholder.svg',
        date: new Date().toISOString(),
        source: 'ESPN Esports',
        url: '#',
        categories: ['Player News']
      }
    ];
    
    setNews(sampleNews);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-12 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-theme-purple mr-2" />
          <span className="text-xl">Loading news...</span>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold font-gaming mb-2">
          <span className="highlight-gradient">Latest</span> Esports News
        </h1>
        <p className="text-gray-400 mb-8">
          Stay updated with the latest news from the world of competitive gaming
        </p>
        
        {news.length > 0 ? (
          <>
            {/* Featured news */}
            <div className="mb-10">
              <NewsCard news={news[0]} variant="featured" />
            </div>
            
            {/* Latest news grid */}
            <h2 className="text-xl font-bold mb-6">Latest Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.slice(1).map((item) => (
                <NewsCard key={item.id} news={item} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-gray-400">No news articles available at the moment.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default NewsPage;
