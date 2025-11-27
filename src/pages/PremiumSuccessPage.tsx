import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Crown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';

const PremiumSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const { profile, refetch } = useProfile();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setIsVerifying(false);
        return;
      }

      try {
        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refetch profile to get updated premium status
        await refetch();
        setVerificationSuccess(true);
      } catch (error) {
        console.error('Error verifying payment:', error);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, refetch]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex flex-col">
        <SearchableNavbar />
        <div className="flex-grow bg-gradient-to-br from-engagement-bg-start to-engagement-bg-end flex items-center justify-center">
          <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border p-8 max-w-md">
            <CardContent className="text-center space-y-6">
              <Loader2 className="w-16 h-16 text-neon-purple mx-auto animate-spin" />
              <div>
                <h2 className="text-2xl font-gaming text-white mb-2">Processing Payment</h2>
                <p className="text-muted-foreground">Please wait while we activate your premium features...</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SearchableNavbar />
      <div className="flex-grow bg-gradient-to-br from-engagement-bg-start to-engagement-bg-end flex items-center justify-center px-4">
        <Card className="bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border p-8 max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-neon-gold to-neon-orange rounded-full flex items-center justify-center animate-premium-glow">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-gaming text-white mb-2">
              Welcome to Season Pass!
            </CardTitle>
            <Badge className="bg-neon-gold/20 text-neon-gold border-neon-gold/30 animate-premium-glow font-gaming">
              <Crown className="w-4 h-4 mr-2" />
              Season Pass Active
            </Badge>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg text-white font-gaming mb-4">
                Your payment was successful!
              </p>
              <p className="text-muted-foreground">
                You now have access to all premium features including exclusive rewards, 
                advanced analytics, and priority support.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-neon-gold/10 rounded-lg border border-neon-gold/20">
                <CheckCircle className="w-5 h-5 text-neon-gold" />
                <span className="text-white font-gaming">Season Pass Reward Track Unlocked</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-neon-gold/10 rounded-lg border border-neon-gold/20">
                <CheckCircle className="w-5 h-5 text-neon-gold" />
                <span className="text-white font-gaming">Exclusive Cards & Packs</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-neon-gold/10 rounded-lg border border-neon-gold/20">
                <CheckCircle className="w-5 h-5 text-neon-gold" />
                <span className="text-white font-gaming">Advanced Statistics</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                className="flex-1 bg-gradient-to-r from-neon-gold to-neon-orange hover:from-neon-gold/80 hover:to-neon-orange/80 text-white font-gaming"
                onClick={() => navigate('/profile')}
              >
                View Profile
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 font-gaming"
                onClick={() => navigate('/')}
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default PremiumSuccessPage;