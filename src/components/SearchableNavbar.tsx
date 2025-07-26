
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import { Menu, X, Search as SearchIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import WalletConnector from './WalletConnector';

interface SearchableNavbarProps {
  showSearch?: boolean;
}

const SearchableNavbar: React.FC<SearchableNavbarProps> = ({ showSearch = true }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { user, loading } = useAuth();
  
  return (
    <nav className="bg-theme-gray-dark border-b border-theme-gray-medium sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center h-full">
            <img 
              src="/lovable-uploads/frags_and_fortunes_transparent.png"
              alt="Frags & Fortunes"
              className="h-full max-h-12 w-auto object-contain"
              style={{ maxHeight: '3rem' }}
            />
            </Link>
            
            <div className="hidden md:flex space-x-4">
              <Link to="/esports/csgo" className="text-gray-300 hover:text-white">
                Matches
              </Link>
              <Link to="/tournaments" className="text-gray-300 hover:text-white">
                Tournaments
              </Link>
              <Link to="/news" className="text-gray-300 hover:text-white">
                News
              </Link>
              <Link to="/teams" className="text-gray-300 hover:text-white">
                Teams
              </Link>
              {user && (
                <>
                  <Link to="/fantasy" className="text-gray-300 hover:text-white">
                    Fantasy
                  </Link>
                  <Link to="/advanced-cards" className="text-gray-300 hover:text-white">
                    Cards
                  </Link>
                </>
              )}
            </div>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {showSearch && (
              <div className="relative">
                <SearchBar />
              </div>
            )}
            
            {!loading && (
              user ? (
                <div className="flex items-center space-x-3">
                  <UserMenu />
                  <WalletConnector />
                </div>
              ) : (
                <>
                  <Button asChild variant="outline" className="border-theme-purple text-theme-purple hover:bg-theme-purple hover:text-white">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                  
                  <Button asChild className="bg-theme-purple hover:bg-theme-purple/90">
                    <Link to="/auth">Sign Up</Link>
                  </Button>
                  
                  <WalletConnector />
                </>
              )
            )}
          </div>
          
          {/* Mobile menu button */}
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
          <div className="md:hidden border-t border-theme-gray-medium">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <div className="flex flex-col space-y-3">
                <Link 
                  to="/esports/csgo" 
                  className="text-white hover:text-theme-purple py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Matches
                </Link>
                <Link 
                  to="/tournaments" 
                  className="text-white hover:text-theme-purple py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Tournaments
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
                
                {user && (
                  <>
                    <Link 
                      to="/fantasy" 
                      className="text-white hover:text-theme-purple py-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Fantasy
                    </Link>
                    <Link 
                      to="/advanced-cards" 
                      className="text-white hover:text-theme-purple py-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Cards
                    </Link>
                  </>
                )}
                
                {!loading && !user && (
                  <div className="pt-2 flex flex-col space-y-2">
                    <Button asChild variant="outline" className="border-theme-purple text-theme-purple hover:bg-theme-purple hover:text-white">
                      <Link to="/auth">Sign In</Link>
                    </Button>
                    
                    <Button asChild className="bg-theme-purple hover:bg-theme-purple/90">
                      <Link to="/auth">Sign Up</Link>
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="px-3 py-2">
                <WalletConnector />
                {user && (
                  <div className="mt-2">
                    <UserMenu />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default SearchableNavbar;
