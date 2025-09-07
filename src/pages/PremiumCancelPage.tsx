import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, Home, RotateCcw } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';

const PremiumCancelPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow bg-gradient-to-br from-engagement-bg-start to-engagement-bg-end flex items-center justify-center px-4">
        <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border p-8 max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-muted-foreground" />
              </div>
            </div>
            <CardTitle className="text-3xl font-gaming text-white mb-2">
              Payment Cancelled
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg text-white font-gaming mb-4">
                No worries!
              </p>
              <p className="text-muted-foreground">
                Your payment was cancelled and no charges were made. 
                You can try again anytime or continue using the free features.
              </p>
            </div>

            <div className="p-4 bg-neon-blue/10 rounded-lg border border-neon-blue/20">
              <p className="text-neon-blue font-gaming text-center">
                Premium features are always available when you're ready to upgrade!
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                className="flex-1 bg-gradient-to-r from-neon-gold to-neon-orange hover:from-neon-gold/80 hover:to-neon-orange/80 text-white font-gaming"
                onClick={() => navigate('/profile')}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 font-gaming"
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default PremiumCancelPage;