
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import FeaturedGames from '@/components/FeaturedGames';
import TopBettingSites from '@/components/TopBettingSites';
import PromoBanner from '@/components/PromoBanner';
import Testimonials from '@/components/Testimonials';
import Footer from '@/components/Footer';
import EsportsNavigation from '@/components/EsportsNavigation';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <Hero />
        
        <div className="container mx-auto px-4 py-12">
          <div className="mb-10">
            <h2 className="text-2xl font-bold font-gaming mb-6 text-center">
              <span className="highlight-gradient">Compare Odds</span> Across Esports
            </h2>
            <p className="text-gray-300 text-center mb-8">
              Find the best betting odds for your favorite esports games and matches. 
              Compare offers from multiple bookmakers all in one place.
            </p>
            <EsportsNavigation />
            <div className="text-center">
              <Button asChild className="bg-theme-purple hover:bg-theme-purple/90">
                <Link to="/esports/csgo">View All Esports Odds</Link>
              </Button>
            </div>
          </div>
        </div>
        
        <FeaturedGames />
        <TopBettingSites />
        <PromoBanner />
        <Testimonials />
      </div>
      <Footer />
    </div>
  );
};

export default Index;
