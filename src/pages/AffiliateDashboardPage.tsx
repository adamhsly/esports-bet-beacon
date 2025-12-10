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
  ShieldX
} from 'lucide-react';

interface AffiliateData {
  id: string;
  referral_code: string;
  rev_share_percent: number;
  tier: string;
  status: string;
  name: string;
}

interface EarningsSummary {
  totalReferredUsers: number;
  totalPremiumEntries: number;
  totalEarnings: number;
  monthlyEarnings: number;
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
    monthlyEarnings: 0
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
      // Fetch affiliate record
      const { data: affiliate, error: affiliateError } = await supabase
        .from('creator_affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (affiliateError || !affiliate) {
        setAffiliateData(null);
        setLoading(false);
        return;
      }

      setAffiliateData(affiliate);

      // Fetch referred users count
      const { count: referredCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_code', affiliate.referral_code);

      // Fetch earnings
      const { data: earningsData } = await supabase
        .from('affiliate_earnings')
        .select('*')
        .eq('creator_id', affiliate.id);

      const totalEarnings = earningsData?.reduce((sum, e) => sum + e.earnings_amount, 0) || 0;
      
      // Monthly earnings (current month)
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyEarnings = earningsData
        ?.filter(e => e.created_at.startsWith(currentMonth))
        .reduce((sum, e) => sum + e.earnings_amount, 0) || 0;

      setEarnings({
        totalReferredUsers: referredCount || 0,
        totalPremiumEntries: earningsData?.length || 0,
        totalEarnings,
        monthlyEarnings
      });

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SearchableNavbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            <ShieldX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Not an Affiliate</h1>
            <p className="text-muted-foreground mb-6">
              You don't have an active affiliate account. Apply to join our creator program!
            </p>
            <Button onClick={() => navigate('/affiliate-program')}>
              Apply Now
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SearchableNavbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Affiliate Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {affiliateData.name}</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Badge variant="outline" className={getTierColor(affiliateData.tier)}>
              <Trophy className="w-3 h-3 mr-1" />
              {affiliateData.tier} Tier
            </Badge>
            <Badge variant="outline" className="border-primary/50 text-primary">
              {affiliateData.rev_share_percent}% Rev Share
            </Badge>
          </div>
        </div>

        {/* Referral Link Card */}
        <Card className="bg-card border-primary/30 mb-8">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Your Referral Link</p>
                <code className="text-sm bg-muted px-3 py-1 rounded">
                  fragsandfortunes.com/?ref={affiliateData.referral_code}
                </code>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyReferralLink} variant="outline" size="sm">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/?ref=${affiliateData.referral_code}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{earnings.totalReferredUsers}</p>
                  <p className="text-xs text-muted-foreground">Referred Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{earnings.totalPremiumEntries}</p>
                  <p className="text-xs text-muted-foreground">Premium Entries</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${(earnings.totalEarnings / 100).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/10 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${(earnings.monthlyEarnings / 100).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payout History */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No payouts yet. Keep sharing your link to earn!
              </p>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout) => (
                  <div 
                    key={payout.id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">${(payout.amount / 100).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">{payout.month}</p>
                    </div>
                    <Badge 
                      variant="outline"
                      className={payout.status === 'paid' 
                        ? 'border-green-500/50 text-green-500' 
                        : 'border-yellow-500/50 text-yellow-500'
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
      </main>

      <Footer />
    </div>
  );
};

export default AffiliateDashboardPage;
