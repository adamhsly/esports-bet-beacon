
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { ProfilePage } from '@/components/GameProfileHud';
import { usePremiumCheckout } from '@/hooks/usePremiumCheckout';

const Web3ProfilePage: React.FC = () => {
  const { startPremiumCheckout } = usePremiumCheckout();

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow">
        <ProfilePage 
          variant="page"
          onUnlockPremium={startPremiumCheckout}
        />
      </div>
      <Footer />
    </div>
  );
};

export default Web3ProfilePage;
