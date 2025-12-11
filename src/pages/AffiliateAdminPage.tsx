import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Check, X, Users, DollarSign, TrendingUp, Clock, Shield } from 'lucide-react';

interface CreatorApplication {
  id: string;
  name: string;
  email: string;
  platform_links: any;
  discord: string | null;
  avg_viewers: string | null;
  message: string | null;
  status: string;
  created_at: string;
  // Linked F&F account info
  ff_user_id?: string;
  ff_username?: string;
  ff_full_name?: string;
}

interface CreatorAffiliate {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  rev_share_percent: number;
  tier: string;
  status: string;
  user_id: string | null;
  created_at: string;
}

const AffiliateAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<CreatorApplication[]>([]);
  const [affiliates, setAffiliates] = useState<CreatorAffiliate[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    pendingApplications: 0,
    totalEarnings: 0,
    pendingPayouts: 0,
  });

  // Check admin role - only after auth is done loading
  useEffect(() => {
    const checkAdminRole = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      if (!user) {
        setCheckingAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) {
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch (err) {
        console.error('Error checking admin role:', err);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminRole();
  }, [user, authLoading]);

  // Redirect non-admins - only after auth is done loading
  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) return;
    
    if (!checkingAdmin && !user) {
      navigate('/auth');
    } else if (!checkingAdmin && isAdmin === false) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/');
    }
  }, [checkingAdmin, user, isAdmin, navigate, authLoading]);

  // Fetch data only if admin
  useEffect(() => {
    if (isAdmin === true) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch applications (admin only via RLS)
      const { data: apps } = await supabase
        .from('creator_applications')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch affiliates
      const { data: affs } = await supabase
        .from('creator_affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch earnings summary
      const { data: earningsData } = await supabase
        .from('affiliate_earnings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setApplications(apps || []);
      setAffiliates(affs || []);
      setEarnings(earningsData || []);

      // Calculate stats
      const totalEarnings = (earningsData || []).reduce((sum, e) => sum + (e.earnings_amount || 0), 0);
      setStats({
        totalAffiliates: (affs || []).filter(a => a.status === 'active').length,
        pendingApplications: (apps || []).filter(a => a.status === 'pending').length,
        totalEarnings,
        pendingPayouts: 0,
      });
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const approveApplication = async (application: CreatorApplication) => {
    try {
      // Generate unique referral code
      const referralCode = `${application.name.toLowerCase().replace(/\s+/g, '')}_${Math.random().toString(36).substr(2, 6)}`;
      const tier = 'bronze';
      const revSharePercent = 20;

      // Create affiliate record
      const { error: affiliateError } = await supabase
        .from('creator_affiliates')
        .insert({
          name: application.name,
          email: application.email,
          referral_code: referralCode,
          platform_links: application.platform_links,
          discord: application.discord,
          tier,
          rev_share_percent: revSharePercent,
          status: 'active',
        });

      if (affiliateError) throw affiliateError;

      // Update application status to approved
      const { error: updateError } = await supabase
        .from('creator_applications')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', application.id);

      if (updateError) {
        console.error('Error updating application status:', updateError);
        // Continue anyway - affiliate was created successfully
      }

      // Send approval email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-affiliate-approval', {
          body: {
            name: application.name,
            email: application.email,
            referralCode,
            tier,
            revSharePercent,
          },
        });

        if (emailError) {
          console.error('Error sending approval email:', emailError);
          toast.warning(`Approved ${application.name}, but failed to send email notification`);
        } else {
          toast.success(`Approved ${application.name}! Approval email sent.`);
        }
      } catch (emailErr) {
        console.error('Error invoking email function:', emailErr);
        toast.warning(`Approved ${application.name}, but email notification failed`);
      }

      fetchData();
    } catch (err: any) {
      console.error('Error approving application:', err);
      toast.error('Failed to approve application: ' + err.message);
    }
  };

  const updateAffiliateTier = async (affiliateId: string, tier: string, revShare: number) => {
    try {
      const { error } = await supabase
        .from('creator_affiliates')
        .update({ tier, rev_share_percent: revShare })
        .eq('id', affiliateId);

      if (error) throw error;
      toast.success('Tier updated successfully');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to update tier: ' + err.message);
    }
  };

  const formatCurrency = (pence: number) => {
    return `$${(pence / 100).toFixed(2)}`;
  };

  // Show loading while auth or admin status is being checked
  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <SearchableNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-2 animate-pulse">
            <Shield className="h-5 w-5" />
            <span>Checking admin permissions...</span>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if not admin (redirect will happen)
  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SearchableNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">Loading admin data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SearchableNavbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Affiliate Admin</h1>
        </div>
        <p className="text-muted-foreground mb-8">Manage creator applications and affiliates</p>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalAffiliates}</p>
                  <p className="text-sm text-muted-foreground">Active Affiliates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pendingApplications}</p>
                  <p className="text-sm text-muted-foreground">Pending Apps</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</p>
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{earnings.length}</p>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="applications" className="space-y-4">
          <TabsList>
            <TabsTrigger value="applications">
              Applications {stats.pendingApplications > 0 && <Badge className="ml-2 bg-yellow-500">{stats.pendingApplications}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
            <TabsTrigger value="earnings">Earnings Log</TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Creator Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <p className="text-muted-foreground">No applications yet</p>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <div key={app.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{app.name}</h3>
                            <p className="text-sm text-muted-foreground">{app.email}</p>
                            {app.discord && <p className="text-sm">Discord: {app.discord}</p>}
                            {app.avg_viewers && <p className="text-sm">Avg Viewers: {app.avg_viewers}</p>}
                            {app.message && <p className="text-sm mt-2 text-muted-foreground italic">"{app.message}"</p>}
                            <div className="flex gap-2 mt-2">
                              {Array.isArray(app.platform_links) && app.platform_links.map((link: string, i: number) => {
                                try {
                                  const url = new URL(link);
                                  return (
                                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                      {url.hostname}
                                    </a>
                                  );
                                } catch {
                                  // Invalid URL - display as plain text
                                  return <span key={i} className="text-xs text-muted-foreground">{link}</span>;
                                }
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={app.status === 'pending' ? 'secondary' : app.status === 'approved' ? 'default' : 'destructive'}>
                              {app.status}
                            </Badge>
                            {app.status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => approveApplication(app)}>
                                  <Check className="h-4 w-4 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="affiliates">
            <Card>
              <CardHeader>
                <CardTitle>Active Affiliates</CardTitle>
              </CardHeader>
              <CardContent>
                {affiliates.length === 0 ? (
                  <p className="text-muted-foreground">No affiliates yet</p>
                ) : (
                  <div className="space-y-4">
                    {affiliates.map((affiliate) => (
                      <div key={affiliate.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{affiliate.name}</h3>
                            <p className="text-sm text-muted-foreground">{affiliate.email}</p>
                            <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
                              Code: {affiliate.referral_code}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              defaultValue={affiliate.tier}
                              onValueChange={(value) => {
                                const revShare = value === 'gold' ? 30 : value === 'silver' ? 25 : 20;
                                updateAffiliateTier(affiliate.id, value, revShare);
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bronze">Bronze (20%)</SelectItem>
                                <SelectItem value="silver">Silver (25%)</SelectItem>
                                <SelectItem value="gold">Gold (30%)</SelectItem>
                              </SelectContent>
                            </Select>
                            <Badge variant={affiliate.status === 'active' ? 'default' : 'secondary'}>
                              {affiliate.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Recent Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                {earnings.length === 0 ? (
                  <p className="text-muted-foreground">No earnings recorded yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Creator</th>
                          <th className="text-right py-2">Entry Fee</th>
                          <th className="text-right py-2">Share %</th>
                          <th className="text-right py-2">Earned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {earnings.map((earning) => (
                          <tr key={earning.id} className="border-b">
                            <td className="py-2">{new Date(earning.created_at).toLocaleDateString()}</td>
                            <td className="py-2">{earning.creator_id?.slice(0, 8)}...</td>
                            <td className="text-right py-2">{formatCurrency(earning.entry_fee)}</td>
                            <td className="text-right py-2">{earning.rev_share_percent}%</td>
                            <td className="text-right py-2 text-green-500">{formatCurrency(earning.earnings_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default AffiliateAdminPage;
