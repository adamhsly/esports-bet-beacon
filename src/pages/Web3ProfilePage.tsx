
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import ProfilePageLive from '@/components/ProfilePageLive';

const Web3ProfilePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft size={16} className="mr-2" />
                Back to Home
              </Link>
            </Button>
            <h1 className="text-3xl font-bold font-gaming">
              <span className="highlight-gradient">Web3</span> Profile
            </h1>
          </div>

          <div className="max-w-4xl mx-auto">
            <ProfilePageLive 
              onUnlockPremium={() => {
                // Handle premium unlock navigation
                console.log('Navigate to premium checkout');
              }}
            />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Web3ProfilePage;
