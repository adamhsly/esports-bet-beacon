import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  ExternalLink,
  Trophy,
  Calendar,
  Loader2,
  ShieldX,
  Sparkles,
  UserCheck,
  Gamepad2
} from 'lucide-react';

interface AffiliateData {
  id: string;
  referral_code: string;
  rev_share_percent: number;
  pay_per_play_rate: number;
  compensation_type: 'revenue_share' | 'pay_per_play';
  tier: string;
  status: string;
  name: string;
}

interface EarningsSummary {
  totalReferredUsers: number;
  totalPremiumEntries: number;
  totalEarnings: number;
  monthlyEarnings: number;
  // Pay per play specific
  totalActivations: number;
  pendingActivations: number;
  monthlyActivations: number;
}

interface Payout {
  id: string;
  amount: number;
  month: string;
  status: string;
  paid_at: string | null;
}

const AffiliateDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary>({
    totalReferredUsers: 0,
    totalPremiumEntries: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
    totalActivations: 0,
    pendingActivations: 0,
    monthlyActivations: 0
  });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchAffiliateData();
    }
  }, [user, authLoading, navigate]);

  const fetchAffiliateData = async () => {
    if (!user) return;
    
    try {
      // First try by user_id
      let { data: affiliate, error: affiliateError } = await supabase
        .from('creator_affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // If not found by user_id, try by email
      if (affiliateError || !affiliate) {
        const { data: affiliateByEmail } = await supabase
          .from('creator_affiliates')
          .select('*')
          .eq('email', user.email)
          .single();
        
        if (affiliateByEmail) {
          affiliate = affiliateByEmail;
          
          // Link the user_id if not already set
          if (!affiliateByEmail.user_id) {
            await supabase
              .from('creator_affiliates')
              .update({ user_id: user.id })
              .eq('id', affiliateByEmail.id);
          }
        }
      }

      if (!affiliate) {
        setAffiliateData(null);
        setLoading(false);
        return;
      }

      // Cast compensation_type to the expected union type
      const typedAffiliate: AffiliateData = {
        ...affiliate,
        compensation_type: (affiliate.compensation_type as 'revenue_share' | 'pay_per_play') || 'revenue_share'
      };

      setAffiliateData(typedAffiliate);
        return;
      }

      setAffiliateData(affiliate);

      // Fetch referred users count
      const { count: referredCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_code', affiliate.referral_code);

      const currentMonth = new Date().toISOString().slice(0, 7);

      if (affiliate.compensation_type === 'pay_per_play') {
        // Fetch activations for pay-per-play affiliates
        const { data: activationsData } = await supabase
          .from('affiliate_activations')
          .select('*')
          .eq('creator_id', affiliate.id);

        const totalActivations = activationsData?.filter(a => a.activated).length || 0;
        const pendingActivations = activationsData?.filter(a => !a.activated).length || 0;
        const monthlyActivations = activationsData
          ?.filter(a => a.activated && a.first_round_played_at?.startsWith(currentMonth))
          .length || 0;

        const totalEarnings = activationsData
          ?.filter(a => a.activated)
          .reduce((sum, a) => sum + a.payout_amount, 0) || 0;

        const monthlyEarnings = activationsData
          ?.filter(a => a.activated && a.first_round_played_at?.startsWith(currentMonth))
          .reduce((sum, a) => sum + a.payout_amount, 0) || 0;

        setEarnings({
          totalReferredUsers: referredCount || 0,
          totalPremiumEntries: 0,
          totalEarnings,
          monthlyEarnings,
          totalActivations,
          pendingActivations,
          monthlyActivations
        });
      } else {
        // Fetch earnings for revenue share affiliates
        const { data: earningsData } = await supabase
          .from('affiliate_earnings')
          .select('*')
          .eq('creator_id', affiliate.id);

        const totalEarnings = earningsData?.reduce((sum, e) => sum + e.earnings_amount, 0) || 0;
        
        const monthlyEarnings = earningsData
          ?.filter(e => e.created_at.startsWith(currentMonth))
          .reduce((sum, e) => sum + e.earnings_amount, 0) || 0;

        setEarnings({
          totalReferredUsers: referredCount || 0,
          totalPremiumEntries: earningsData?.length || 0,
          totalEarnings,
          monthlyEarnings,
          totalActivations: 0,
          pendingActivations: 0,
          monthlyActivations: 0
        });
      }

      // Fetch payouts
      const { data: payoutsData } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('creator_id', affiliate.id)
        .order('created_at', { ascending: false });

      setPayouts(payoutsData || []);
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!affiliateData) return;
    const link = `https://fragsandfortunes.com/?ref=${affiliateData.referral_code}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Your referral link has been copied to clipboard.",
    });
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'gold': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'silver': return 'bg-gray-400/20 text-gray-300 border-gray-400/50';
      default: return 'bg-amber-700/20 text-amber-500 border-amber-700/50';
    }
  };

  const getCompensationLabel = () => {
    if (!affiliateData) return '';
    if (affiliateData.compensation_type === 'pay_per_play') {
      return `$${(affiliateData.pay_per_play_rate / 100).toFixed(2)} Per Activation`;
    }
    return `${affiliateData.rev_share_percent}% Rev Share`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SearchableNavbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span className="text-white/70">Loading dashboard...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!affiliateData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SearchableNavbar />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto">
            <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4 text-white">Not an Affiliate</h1>
            <p className="text-white/70 mb-6">
              You don't have an active affiliate account. Apply to join our partner program!
            </p>
            <Button 
              onClick={() => navigate('/affiliate-program')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
            >
              Apply Now
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isPayPerPlay = affiliateData.compensation_type === 'pay_per_play';

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-screen flex flex-col">
      <SearchableNavbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-8 md:py-16">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-blue-900/10 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]" />
        </div>

        <div className="container mx-auto px-3 relative z-10 max-w-full">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-purple-400" />
                <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Affiliate Dashboard
                </h1>
              </div>
              <p className="text-muted-foreground text-sm md:text-base">Welcome back, {affiliateData.name}</p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <Badge variant="outline" className={getTierColor(affiliateData.tier)}>
                <Trophy className="w-3 h-3 mr-1" />
                {affiliateData.tier} Tier
              </Badge>
              <Badge variant="outline" className={isPayPerPlay ? "border-green-500/50 text-green-400" : "border-purple-500/50 text-purple-400"}>
                {getCompensationLabel()}
              </Badge>
            </div>
          </div>

          {/* Stats Grid - Dynamic based on compensation type */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-blue-500/30 hover:border-blue-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 md:h-8 md:w-8 text-blue-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">{earnings.totalReferredUsers}</p>
                    <p className="text-xs md:text-sm text-white/70">Referred Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isPayPerPlay ? (
              <>
                <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-green-500/30 hover:border-green-500/60 transition-all">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-3">
                      <UserCheck className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
                      <div>
                        <p className="text-xl md:text-2xl font-bold text-white">{earnings.totalActivations}</p>
                        <p className="text-xs md:text-sm text-white/70">Activated Users</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-yellow-500/30 hover:border-yellow-500/60 transition-all">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-3">
                      <Gamepad2 className="h-6 w-6 md:h-8 md:w-8 text-yellow-400" />
                      <div>
                        <p className="text-xl md:text-2xl font-bold text-white">{earnings.pendingActivations}</p>
                        <p className="text-xs md:text-sm text-white/70">Pending (No Round)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30 hover:border-purple-500/60 transition-all">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-purple-400" />
                      <div>
                        <p className="text-xl md:text-2xl font-bold text-white">{earnings.totalPremiumEntries}</p>
                        <p className="text-xs md:text-sm text-white/70">Premium Entries</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-green-500/30 hover:border-green-500/60 transition-all">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-green-400" />
                      <div>
                        <p className="text-xl md:text-2xl font-bold text-white">${(earnings.totalEarnings / 100).toFixed(2)}</p>
                        <p className="text-xs md:text-sm text-white/70">Total Earnings</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-yellow-500/30 hover:border-yellow-500/60 transition-all">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-6 w-6 md:h-8 md:w-8 text-yellow-400" />
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-white">
                      {isPayPerPlay 
                        ? `$${(earnings.monthlyEarnings / 100).toFixed(2)}`
                        : `$${(earnings.monthlyEarnings / 100).toFixed(2)}`
                      }
                    </p>
                    <p className="text-xs md:text-sm text-white/70">This Month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 py-8 md:py-12 bg-gradient-to-br from-[#0B0F14] to-[#12161C]">
        <div className="container mx-auto px-3 max-w-full space-y-6">
          {/* Compensation Info Card */}
          <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-blue-400">
                {isPayPerPlay ? 'Pay Per Activation Model' : 'Revenue Share Model'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/80">
                {isPayPerPlay 
                  ? `You earn $${(affiliateData.pay_per_play_rate / 100).toFixed(2)} for each user who registers with your link AND plays their first round (any round type). Users who register but haven't played yet are shown as "Pending".`
                  : `You earn ${affiliateData.rev_share_percent}% of every premium contest entry fee from users who signed up with your referral link. Earnings are calculated on each paid entry.`
                }
              </p>
            </CardContent>
          </Card>

          {/* Referral Link Card */}
          <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-400">Your Referral Link</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <code className="text-sm bg-background/50 px-3 py-2 rounded border border-border/50 text-white/80">
                  fragsandfortunes.com/?ref={affiliateData.referral_code}
                </code>
                <div className="flex gap-2">
                  <Button 
                    onClick={copyReferralLink} 
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                    onClick={() => window.open(`/?ref=${affiliateData.referral_code}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Earnings Card */}
          <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-green-500/30">
            <CardHeader>
              <CardTitle className="text-green-400">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-4xl md:text-5xl font-bold text-green-400">
                  ${(earnings.totalEarnings / 100).toFixed(2)}
                </p>
                <p className="text-white/70 mt-2">
                  {isPayPerPlay 
                    ? `From ${earnings.totalActivations} activated users`
                    : `From ${earnings.totalPremiumEntries} premium entries`
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payout History */}
          <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-yellow-500/30">
            <CardHeader>
              <CardTitle className="text-yellow-400">Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <p className="text-white/70 text-center py-8">
                  No payouts yet. Keep sharing your link to earn!
                </p>
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <div 
                      key={payout.id} 
                      className="flex items-center justify-between p-3 bg-background/30 rounded-lg border border-border/50 hover:border-green-500/40 transition-all"
                    >
                      <div>
                        <p className="font-medium text-white">${(payout.amount / 100).toFixed(2)}</p>
                        <p className="text-sm text-white/70">{payout.month}</p>
                      </div>
                      <Badge 
                        variant="outline"
                        className={payout.status === 'paid' 
                          ? 'border-green-500/50 text-green-400' 
                          : 'border-yellow-500/50 text-yellow-400'
                        }
                      >
                        {payout.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AffiliateDashboardPage;