
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <div className="relative overflow-hidden py-16 md:py-24">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-theme-dark z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-glass-neon-purple/20 rounded-full blur-3xl neon-glow"></div>
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-glass-neon-blue/20 rounded-full blur-3xl neon-glow"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card p-8 rounded-2xl mb-8 neon-border">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-gaming mb-6 tracking-tight glass-text-primary">
              Your Ultimate <span className="highlight-gradient">Esports</span><br />
              Hub for <span className="text-glass-neon-green">Scores & Stats</span>
            </h1>
            
            <p className="text-lg md:text-xl glass-text-secondary mb-8 max-w-2xl mx-auto">
              Live match tracking, team insights, and tournament coverage for CS:GO, LoL, Dota 2, and more.
              Stay ahead with real-time scores and professional esports analytics.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/esports/csgo" className="glass-button neon-glow hover:scale-102 transition-all duration-300 flex items-center justify-center gap-2">
              View Live Matches
              <ArrowRight size={20} />
            </Link>
            
            <Link to="/tournaments" className="glass-button glass-button-secondary hover:scale-102 transition-all duration-300 flex items-center justify-center gap-2">
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
