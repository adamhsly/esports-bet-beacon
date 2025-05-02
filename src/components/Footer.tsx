
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-theme-gray-dark border-t border-theme-gray-medium mt-16 py-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold font-gaming tracking-wider text-white">
              <span className="highlight-gradient">ESPORTS</span>
              <span className="text-theme-green">BEACON</span>
            </h3>
            <p className="text-gray-400 text-sm">
              The premier destination for esports betting comparisons, guides, and exclusive bonus offers.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-4">Betting Sites</h4>
            <ul className="space-y-2">
              <li><Link to="/betting-sites" className="text-gray-400 hover:text-theme-purple text-sm">All Betting Sites</Link></li>
              <li><Link to="/betting-sites/best" className="text-gray-400 hover:text-theme-purple text-sm">Top Rated Sites</Link></li>
              <li><Link to="/betting-sites/new" className="text-gray-400 hover:text-theme-purple text-sm">New Betting Sites</Link></li>
              <li><Link to="/betting-sites/bonuses" className="text-gray-400 hover:text-theme-purple text-sm">Best Bonuses</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-4">Esports</h4>
            <ul className="space-y-2">
              <li><Link to="/esports/csgo" className="text-gray-400 hover:text-theme-purple text-sm">CS:GO</Link></li>
              <li><Link to="/esports/lol" className="text-gray-400 hover:text-theme-purple text-sm">League of Legends</Link></li>
              <li><Link to="/esports/dota2" className="text-gray-400 hover:text-theme-purple text-sm">Dota 2</Link></li>
              <li><Link to="/esports/valorant" className="text-gray-400 hover:text-theme-purple text-sm">Valorant</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-medium mb-4">Information</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-400 hover:text-theme-purple text-sm">About Us</Link></li>
              <li><Link to="/responsible-gambling" className="text-gray-400 hover:text-theme-purple text-sm">Responsible Gambling</Link></li>
              <li><Link to="/privacy" className="text-gray-400 hover:text-theme-purple text-sm">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-theme-purple text-sm">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-theme-gray-medium mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm text-center md:text-left">
            © {currentYear} EsportsBeacon. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0">
            <p className="text-gray-500 text-xs text-center md:text-left">
              18+ | Gamble Responsibly | T&Cs Apply
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
