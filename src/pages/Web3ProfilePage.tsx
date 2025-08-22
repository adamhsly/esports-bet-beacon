
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { ProfilePage } from '@/components/GameProfileHud';

const Web3ProfilePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow">
        <ProfilePage 
          variant="page"
          onUnlockPremium={() => {
            // Handle premium unlock navigation
            console.log('Navigate to premium checkout');
          }}
        />
      </div>
      <Footer />
    </div>
  );
};

export default Web3ProfilePage;
