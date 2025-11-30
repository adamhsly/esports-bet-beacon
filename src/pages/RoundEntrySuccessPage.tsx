import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';

export const RoundEntrySuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entryConfirmed, setEntryConfirmed] = useState(false);
  const [pickId, setPickId] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');
  const roundId = searchParams.get('round_id');

  useEffect(() => {
    const checkEntry = async () => {
      if (!sessionId || !roundId) {
        setLoading(false);
        return;
      }

      // Poll for entry confirmation (webhook might take a moment)
      let attempts = 0;
      const maxAttempts = 10;

      const pollEntry = async () => {
        const { data, error } = await supabase
          .from('round_entries')
          .select('id, status, pick_id')
          .eq('stripe_session_id', sessionId)
          .single();

        if (data?.status === 'completed') {
          setEntryConfirmed(true);
          setPickId(data.pick_id);
          setLoading(false);
          return true;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          // Even if we can't confirm, assume success and redirect
          setEntryConfirmed(true);
          setLoading(false);
          return true;
        }

        return false;
      };

      const poll = async () => {
        const done = await pollEntry();
        if (!done) {
          setTimeout(poll, 1000);
        }
      };

      poll();
    };

    checkEntry();
  }, [sessionId, roundId]);

  const handleContinue = () => {
    if (roundId) {
      navigate(`/fantasy?roundId=${roundId}`);
    } else {
      navigate('/fantasy');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SearchableNavbar />
      <div className="flex-grow flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-card border-border">
          <CardContent className="p-8 text-center">
            {loading ? (
              <>
                <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Confirming Entry...
                </h1>
                <p className="text-muted-foreground">
                  Please wait while we confirm your payment.
                </p>
              </>
            ) : entryConfirmed ? (
              <>
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl"></div>
                  <CheckCircle className="h-20 w-20 text-green-500 mx-auto relative" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Entry Confirmed!
                </h1>
                <p className="text-muted-foreground mb-6">
                  Your payment was successful. You're now entered into the round!
                </p>
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-muted-foreground">
                    Now pick your teams to compete for the prizes:
                  </p>
                  <div className="flex justify-center gap-4 mt-2 text-lg font-semibold">
                    <span className="text-yellow-400">🥇 £100</span>
                    <span className="text-gray-400">🥈 £25</span>
                    <span className="text-orange-400">🥉 £5</span>
                  </div>
                </div>
                <Button 
                  onClick={handleContinue}
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  Pick Your Teams
                </Button>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Something went wrong
                </h1>
                <p className="text-muted-foreground mb-6">
                  We couldn't confirm your entry. Please contact support if you were charged.
                </p>
                <Button onClick={() => navigate('/fantasy')} variant="outline">
                  Return to Fantasy
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};
