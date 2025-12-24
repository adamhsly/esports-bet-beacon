import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Clock, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWelcomeOffer } from '@/hooks/useWelcomeOffer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WelcomeOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WelcomeOfferModal: React.FC<WelcomeOfferModalProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status, daysRemaining, displayState, refetch } = useWelcomeOffer();
  const [claiming, setClaiming] = useState(false);

  const formatPence = (pence: number) => {
    const dollars = pence / 100;
    return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`;
  };
  const rewardAmount = status?.rewardPence ? formatPence(status.rewardPence) : '$10';

  const handleClaimBonus = async () => {
    if (!user) {
      toast.error('Please sign in to claim your bonus');
      return;
    }

    setClaiming(true);
    try {
      // Use type assertion as the function was just created
      const { data, error } = await (supabase.rpc as any)('claim_welcome_bonus', { p_user_id: user.id });
      
      if (error) {
        console.error('Error claiming bonus:', error);
        toast.error(error.message || 'Failed to claim bonus');
      } else if (data?.success === false) {
        toast.error(data.error || 'Failed to claim bonus');
      } else {
        // Show success and navigate to fantasy page
        const roundName = data?.round_name || 'upcoming paid rounds';
        toast.success(`${rewardAmount} claimed! Use your promo balance on ${roundName}`);
        refetch();
        onOpenChange(false);
        // Navigate to fantasy page - the user can pick their teams when the round opens
        navigate('/fantasy');
      }
    } catch (err) {
      console.error('Error claiming bonus:', err);
      toast.error('Failed to claim bonus');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-theme-gray-dark border-green-500/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gift className="w-5 h-5 text-green-400" />
            Welcome Bonus
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hero section */}
          <div className="bg-gradient-to-r from-green-600/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4 text-center">
            <Sparkles className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
            <h3 className="text-2xl font-bold text-white mb-1">
              Get {rewardAmount} Free!
            </h3>
            <p className="text-sm text-gray-300">
              New users receive {rewardAmount} promo balance to use on paid fantasy entries
            </p>
          </div>

          {/* Already claimed - show active balance */}
          {status && displayState === 'active' && status.promoBalancePence > 0 && (
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="font-semibold text-green-300">Bonus Claimed!</span>
              </div>
              <p className="text-sm text-white">
                Balance: <span className="font-bold text-green-300">{formatPence(status.promoBalancePence)}</span>
              </p>
              {daysRemaining !== null && (
                <p className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  Expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* How it works */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">How It Works</h4>
            
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-green-300">1</span>
                </div>
                <div>
                  <p className="text-sm text-white">Claim your {rewardAmount} bonus</p>
                  <p className="text-xs text-gray-400">Instantly added to your promo balance</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-purple-300">2</span>
                </div>
                <div>
                  <p className="text-sm text-white">Enter paid fantasy rounds</p>
                  <p className="text-xs text-gray-400">Promo balance auto-applies at checkout</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-yellow-300">3</span>
                </div>
                <div>
                  <p className="text-sm text-white">Win prizes!</p>
                  <p className="text-xs text-gray-400">Compete for credits and rewards</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          {displayState === 'progress' && !status?.offerClaimed ? (
            <Button 
              onClick={handleClaimBonus}
              disabled={claiming}
              className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold w-full py-3 text-lg"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Claim {rewardAmount} Now
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={() => {
                onOpenChange(false);
                navigate('/fantasy');
              }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold w-full py-3 text-lg"
            >
              Play Fantasy
            </Button>
          )}

          {/* Fine print */}
          <div className="border-t border-gray-700 pt-3">
            <p className="text-xs text-gray-500">
              Promo balance is valid for 30 days after claiming. Can only be used on paid fantasy round entries. 
              One welcome bonus per account.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeOfferModal;
