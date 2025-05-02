
import React from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import FeaturedGames from '@/components/FeaturedGames';
import TopBettingSites from '@/components/TopBettingSites';
import PromoBanner from '@/components/PromoBanner';
import Testimonials from '@/components/Testimonials';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <Hero />
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
