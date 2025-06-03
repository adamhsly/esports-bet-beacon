
import React from 'react';
import { Link } from 'react-router-dom';
import WalletConnector from './WalletConnector';

interface EsportsNavigationProps {
  activeEsport?: string;
  onEsportChange?: (newEsportId: string) => void;
}

const EsportsNavigation: React.FC<EsportsNavigationProps> = ({ 
  activeEsport, 
  onEsportChange 
}) => {
  return (
    <nav className="bg-theme-gray-dark border-b border-theme-gray-medium">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-theme-purple font-bold text-xl hover:text-theme-purple-light transition-colors"
            >
              EsportsHub
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                to="/teams" 
                className="text-gray-300 hover:text-white transition-colors"
              >
                Teams
              </Link>
              <Link 
                to="/tournaments" 
                className="text-gray-300 hover:text-white transition-colors"
              >
                Tournaments
              </Link>
              <Link 
                to="/cards" 
                className="text-gray-300 hover:text-white transition-colors"
              >
                Cards
              </Link>
              <Link 
                to="/fantasy" 
                className="text-gray-300 hover:text-white transition-colors"
              >
                Fantasy
              </Link>
              <Link 
                to="/news" 
                className="text-gray-300 hover:text-white transition-colors"
              >
                News
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <WalletConnector />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default EsportsNavigation;
