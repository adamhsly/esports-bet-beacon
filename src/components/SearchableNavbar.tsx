
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import UserMenu from './UserMenu';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import WalletConnector from './WalletConnector';

const SearchableNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  
  return (
    <nav className="bg-theme-gray-dark border-b border-theme-gray-medium sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3 md:space-x-6">
          <Link to="/" className="flex items-center h-full">
            <img 
              src="/lovable-uploads/frags_and_fortunes_transparent.png"
              alt="Frags & Fortunes"
              className="h-full max-h-12 w-auto object-contain"
              style={{ maxHeight: '3rem' }}
            />
            </Link>
            
            <div className="flex space-x-2 md:space-x-4 text-sm md:text-base">
              <Link to="/tournaments" className="text-gray-300 hover:text-white">
                Tournaments
              </Link>
              <Link to="/teams" className="text-gray-300 hover:text-white">
                Teams
              </Link>
              <Link to="/fantasy" className="text-gray-300 hover:text-white">
                Fantasy
              </Link>
            </div>
          </div>
          
          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            
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
          
          {/* Mobile Actions */}
          <div className="flex md:hidden items-center">
            {!loading && (
              user ? (
                <UserMenu />
              ) : (
                <Button asChild className="bg-theme-purple hover:bg-theme-purple/90">
                  <Link to="/auth">Login</Link>
                </Button>
              )
            )}
          </div>
        </div>
        
      </div>
    </nav>
  );
};

export default SearchableNavbar;
