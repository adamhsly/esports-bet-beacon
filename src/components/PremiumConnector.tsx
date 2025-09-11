import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Crown, CheckCircle, Loader2 } from 'lucide-react';
import { usePremiumCheckout } from '@/hooks/usePremiumCheckout';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useEntitlement } from '@/hooks/useSupabaseData';

interface PremiumConnectorProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

const PremiumConnector: React.FC<PremiumConnectorProps> = ({ 
  variant = 'default', 
  size = 'default', 
  className = '',
  children 
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { startPremiumCheckout, isLoading } = usePremiumCheckout();
  const { isAuthenticated } = useAuthUser();
  const { premiumActive } = useEntitlement();

  const handleUpgrade = async () => {
    setIsDialogOpen(false);
    await startPremiumCheckout();
  };

  // Only show for logged-in users who are not premium yet
  if (!isAuthenticated || premiumActive) {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={`bg-gradient-to-r from-neon-gold to-neon-orange hover:from-neon-gold/80 hover:to-neon-orange/80 text-white font-gaming animate-premium-glow ${className}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Crown className="w-4 h-4 mr-2" />
          )}
          {children || 'Unlock Premium'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-engagement-card to-engagement-bg-end border-engagement-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white font-gaming text-xl">
            <Crown className="w-6 h-6 text-neon-gold" />
            Get Premium Pass
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-neon-gold to-neon-orange rounded-full flex items-center justify-center mx-auto mb-4 animate-premium-glow">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <p className="text-muted-foreground">
              Unlock exclusive features and premium rewards
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-neon-gold/10 rounded-lg border border-neon-gold/20">
              <CheckCircle className="w-5 h-5 text-neon-gold flex-shrink-0" />
              <span className="text-white font-gaming">Premium Reward Track</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-neon-gold/10 rounded-lg border border-neon-gold/20">
              <CheckCircle className="w-5 h-5 text-neon-gold flex-shrink-0" />
              <span className="text-white font-gaming">Exclusive Card Packs</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-neon-gold/10 rounded-lg border border-neon-gold/20">
              <CheckCircle className="w-5 h-5 text-neon-gold flex-shrink-0" />
              <span className="text-white font-gaming">Advanced Analytics</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-neon-gold/10 rounded-lg border border-neon-gold/20">
              <CheckCircle className="w-5 h-5 text-neon-gold flex-shrink-0" />
              <span className="text-white font-gaming">Priority Support</span>
            </div>
          </div>

          <Button 
            className="w-full bg-gradient-to-r from-neon-gold to-neon-orange hover:from-neon-gold/80 hover:to-neon-orange/80 text-white font-gaming animate-premium-glow"
            onClick={handleUpgrade}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Crown className="w-4 h-4 mr-2" />
                Continue to Secure Checkout
              </>
            )}
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Secure payment powered by Stripe
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumConnector;