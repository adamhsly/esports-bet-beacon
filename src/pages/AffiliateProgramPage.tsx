import React, { useState } from 'react';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  CheckCircle2, 
  Gamepad2,
  Link2,
  Star,
  Trophy,
  Zap
} from 'lucide-react';

const AffiliateProgramPage = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    creatorName: '',
    email: '',
    platformLinks: '',
    avgViewers: '',
    discord: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const platformLinksArray = formData.platformLinks
        .split('\n')
        .map(link => link.trim())
        .filter(link => link.length > 0);

      const { error } = await supabase
        .from('creator_applications')
        .insert({
          name: formData.creatorName,
          email: formData.email,
          platform_links: platformLinksArray,
          avg_viewers: formData.avgViewers,
          discord: formData.discord,
          message: formData.message,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description: "We'll review your application and get back to you within 48 hours.",
      });

      setFormData({
        creatorName: '',
        email: '',
        platformLinks: '',
        avgViewers: '',
        discord: '',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Submission Failed",
        description: "Please try again or contact us directly.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tiers = [
    { 
      name: 'Bronze', 
      percent: 20, 
      requirement: 'Starting tier',
      color: 'from-amber-700 to-amber-900',
      borderColor: 'border-amber-600'
    },
    { 
      name: 'Silver', 
      percent: 25, 
      requirement: '50+ referred entries',
      color: 'from-gray-400 to-gray-600',
      borderColor: 'border-gray-400'
    },
    { 
      name: 'Gold', 
      percent: 30, 
      requirement: '200+ referred entries',
      color: 'from-yellow-400 to-yellow-600',
      borderColor: 'border-yellow-400'
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SearchableNavbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <Badge variant="outline" className="mb-4 px-4 py-1 border-primary/50 text-primary">
                <Star className="w-3 h-3 mr-1" />
                Creator Program
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="text-primary">Become </span>
                <span className="text-yellow-400">a </span>
                <span className="text-foreground">Partner</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8">
                Earn <span className="text-primary font-semibold">20–30% revenue share</span> from premium contest entries.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Fixed Prizes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-blue-500" />
                  <span>Skill-Based Only</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500" />
                  <span>No Gambling</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { icon: Users, title: 'Apply', desc: 'Submit your application below' },
                { icon: CheckCircle2, title: 'Get Approved', desc: 'We review within 48 hours' },
                { icon: Link2, title: 'Share Your Link', desc: 'Get your unique referral link' },
                { icon: DollarSign, title: 'Earn Revenue', desc: 'Get paid monthly via PayPal' }
              ].map((step, i) => (
                <Card key={i} className="bg-card border-border text-center">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-muted-foreground mb-2">{i + 1}</div>
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Revenue Tiers */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">Revenue Share Tiers</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Start at Bronze and grow your earnings as you bring in more players
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {tiers.map((tier) => (
                <Card 
                  key={tier.name} 
                  className={`relative overflow-hidden border-2 ${tier.borderColor} bg-card`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-10`} />
                  <CardHeader className="relative">
                    <CardTitle className="flex items-center justify-between">
                      <span>{tier.name}</span>
                      <Trophy className={`w-5 h-5 ${tier.name === 'Gold' ? 'text-yellow-400' : tier.name === 'Silver' ? 'text-gray-400' : 'text-amber-700'}`} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-4xl font-bold mb-2">{tier.percent}%</div>
                    <p className="text-sm text-muted-foreground">Revenue Share</p>
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm">{tier.requirement}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* What You Earn From */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">What Counts as Revenue</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="bg-card border-green-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-500">
                      <CheckCircle2 className="w-5 h-5" />
                      You Earn From
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-green-500 mt-1" />
                      <span>Premium contest entry fees from users you refer</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-green-500 mt-1" />
                      <span>Daily, Weekly, and Monthly paid rounds</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-green-500 mt-1" />
                      <span>All future premium contest entries by your referrals</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-muted-foreground" />
                      What Counts as a Referral
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-muted-foreground">
                    <p>A new user who:</p>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-1" />
                      <span>Signs up using your unique referral link</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-1" />
                      <span>Is a genuinely new account (no duplicate accounts)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-1" />
                      <span>Completes at least one premium contest entry</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Creator Benefits</h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { icon: TrendingUp, title: 'Lifetime Earnings', desc: 'Earn from every premium entry your referrals make, forever' },
                { icon: DollarSign, title: 'Monthly Payouts', desc: 'Get paid via PayPal or bank transfer every month' },
                { icon: Trophy, title: 'Tier Progression', desc: 'Increase your rev share as you grow your audience' }
              ].map((benefit, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="pt-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <benefit.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Application Form */}
        <section className="py-16 bg-muted/30" id="apply">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-4">Apply Now</h2>
              <p className="text-center text-muted-foreground mb-8">
                Join our creator program and start earning today
              </p>
              
              <Card className="bg-card border-border">
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="creatorName">Creator / Channel Name *</Label>
                        <Input
                          id="creatorName"
                          value={formData.creatorName}
                          onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
                          placeholder="Your creator name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="your@email.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="platformLinks">Platform Links *</Label>
                      <Textarea
                        id="platformLinks"
                        value={formData.platformLinks}
                        onChange={(e) => setFormData({ ...formData, platformLinks: e.target.value })}
                        placeholder="https://twitch.tv/yourchannel&#10;https://youtube.com/@yourchannel&#10;https://twitter.com/yourhandle"
                        rows={3}
                        required
                      />
                      <p className="text-xs text-muted-foreground">One link per line (Twitch, YouTube, Twitter, etc.)</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="avgViewers">Average Viewers / Followers</Label>
                        <Input
                          id="avgViewers"
                          value={formData.avgViewers}
                          onChange={(e) => setFormData({ ...formData, avgViewers: e.target.value })}
                          placeholder="e.g., 500 avg viewers"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discord">Discord Username</Label>
                        <Input
                          id="discord"
                          value={formData.discord}
                          onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                          placeholder="username#1234"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Why do you want to partner with us? (Optional)</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us about your content and audience..."
                        rows={3}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Application'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AffiliateProgramPage;
