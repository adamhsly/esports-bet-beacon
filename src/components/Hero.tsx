import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import heroImage from '/lovable-uploads/Fantasybannerhomepage.png';

const Hero = () => {
  return (
    <div className="relative overflow-hidden py-16 md:py-24">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Fantasy Esports Banner" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-theme-dark/60 via-theme-dark/40 to-theme-dark"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-gaming mb-6 tracking-tight">
            Your Ultimate <span className="highlight-gradient">Esports</span><br />
            Hub for <span className="text-theme-green">Scores & Stats</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Live match tracking, team insights, and tournament coverage for CS:GO, LoL, Dota 2, and more.
            Stay ahead with real-time scores and professional esports analytics.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/esports/csgo" className="cta-button">
              View Live Matches
              <ArrowRight size={20} />
            </Link>
            
            <Link to="/tournaments" className="relative bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] border-2 border-transparent text-white font-medium py-3 px-6 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4)] transition-all duration-[250ms] ease-in-out flex items-center justify-center gap-2 before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none hover:translate-y-[-3px] hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(150,90,255,0.2),0_4px_15px_rgba(0,0,0,0.4)]">
              Browse Tournaments
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
