
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SearchBar from './SearchBar';
import { Menu, X, Search as SearchIcon } from 'lucide-react';

interface SearchableNavbarProps {
  showSearch?: boolean;
}

const SearchableNavbar: React.FC<SearchableNavbarProps> = ({ showSearch = true }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  return (
    <nav className="bg-theme-gray-dark border-b border-theme-gray-medium py-4">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center">
              <span className="font-gaming text-xl text-white">EsportsBet<span className="text-theme-purple">.gg</span></span>
            </Link>
            
            <div className="hidden md:flex space-x-4">
              <Link to="/esports/csgo" className="text-gray-300 hover:text-white">
                Matches
              </Link>
              <Link to="/news" className="text-gray-300 hover:text-white">
                News
              </Link>
              <Link to="/teams" className="text-gray-300 hover:text-white">
                Teams
              </Link>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            {showSearch && (
              <div className="relative">
                <SearchBar />
              </div>
            )}
            
            <Button variant="outline" className="border-theme-purple text-theme-purple hover:bg-theme-purple hover:text-white">
              Sign In
            </Button>
            
            <Button className="bg-theme-purple hover:bg-theme-purple/90">
              Sign Up
            </Button>
          </div>
          
          <div className="flex md:hidden items-center space-x-3">
            {showSearch && (
              <Button 
                variant="ghost" 
                size="icon"
                className="text-white"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              >
                {isSearchOpen ? <X size={24} /> : <SearchIcon size={24} />}
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>
        
        {/* Mobile search */}
        {isSearchOpen && showSearch && (
          <div className="md:hidden mt-4 pb-2">
            <SearchBar />
          </div>
        )}
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-2">
            <div className="flex flex-col space-y-3">
              <Link 
                to="/esports/csgo" 
                className="text-white hover:text-theme-purple py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Matches
              </Link>
              <Link 
                to="/news" 
                className="text-white hover:text-theme-purple py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                News
              </Link>
              <Link 
                to="/teams" 
                className="text-white hover:text-theme-purple py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Teams
              </Link>
              
              <div className="pt-2 flex flex-col space-y-2">
                <Button variant="outline" className="border-theme-purple text-theme-purple hover:bg-theme-purple hover:text-white">
                  Sign In
                </Button>
                
                <Button className="bg-theme-purple hover:bg-theme-purple/90">
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default SearchableNavbar;
