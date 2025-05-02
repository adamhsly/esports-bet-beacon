
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const PromoBanner = () => {
  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-theme-purple/80 to-theme-blue/80 p-8 md:p-10">
          {/* Background elements */}
          <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-theme-green/20 blur-2xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0 md:mr-6 text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold font-gaming text-white mb-3">
                Exclusive Sign-up Bonus
              </h3>
              <p className="text-lg text-white/90 mb-4 max-w-xl">
                Get a 100% match up to $500 + 200 free spins when you register with our special promo code!
              </p>
              <div className="flex items-center justify-center md:justify-start space-x-2 text-white text-sm">
                <span className="bg-white/20 rounded px-2 py-1">Limited Time Offer</span>
                <span className="bg-theme-green/20 rounded px-2 py-1">Verified Today</span>
              </div>
            </div>
            
            <Link 
              to="/go/special-offer" 
              className="shrink-0 bg-theme-green text-black font-bold py-3 px-6 rounded-md hover:brightness-110 transition-all font-gaming flex items-center justify-center gap-2 animate-pulse-glow"
            >
              Claim Bonus Now
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanner;
