import React from 'react';
import { CreatePrivateRound } from '@/components/fantasy/CreatePrivateRound';
import { useAuth } from '@/contexts/AuthContext';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';

export const CreatePrivateRoundPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow container mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Create Private Round</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to create a private round
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Sign In
          </button>
        </div>
        <Footer />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-theme-gray-dark">
      <SearchableNavbar />
      <div className="flex-grow">
        <CreatePrivateRound />
      </div>
      <Footer />
    </div>
  );
};
