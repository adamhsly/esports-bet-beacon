
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
                to="/" 
                className="text-gray-300 hover:text-white transition-colors"
              >
                Matches
              </Link>
              <Link 
                to="/fantasy" 
                className="text-gray-300 hover:text-white transition-colors"
              >
                Fantasy
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
