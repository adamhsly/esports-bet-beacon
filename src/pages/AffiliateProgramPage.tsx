import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  DollarSign, 
  TrendingUp, 
  Shield, 
  CheckCircle2, 
  Gamepad2,
  Star,
  Trophy,
  Zap,
  LogIn,
  Users
} from 'lucide-react';

const FORM_STORAGE_KEY = 'affiliate_application_form';

const AffiliateProgramPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [formData, setFormData] = useState({
    creatorName: '',
    platformLinks: '',
    avgViewers: '',
    discord: '',
    message: '',
    compensationType: 'revenue_share' as 'revenue_share' | 'pay_per_play'
  });

  // Load form data from localStorage on mount
  useEffect(() => {
    const savedForm = localStorage.getItem(FORM_STORAGE_KEY);
    if (savedForm) {
      try {
        const parsed = JSON.parse(savedForm);
        setFormData(parsed);
      } catch (e) {
        console.error('Error parsing saved form data:', e);
      }
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    const hasData = Object.values(formData).some(v => v.trim() !== '');
    if (hasData) {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData]);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Add scroll reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
          }
        });
      },
      { threshold: 0.1 },
    );

    document.querySelectorAll(".reveal-on-scroll").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is logged in
    if (!user) {
      setShowLoginRequiredModal(true);
      return;
    }
    
    setIsSubmitting(true);

    try {
      const platformLinksArray = formData.platformLinks
        .split('\n')
        .map(link => link.trim())
        .filter(link => link.length > 0);

      const userEmail = user?.email || '';
      
      const { error } = await supabase
        .from('creator_applications')
        .insert({
          name: formData.creatorName,
          email: userEmail,
          platform_links: platformLinksArray,
          avg_viewers: formData.avgViewers,
          discord: formData.discord,
          message: formData.message,
          preferred_compensation: formData.compensationType,
          status: 'pending'
        });

      if (error) throw error;

      // Send notification email
      try {
        await supabase.functions.invoke('send-affiliate-notification', {
          body: {
            name: formData.creatorName,
            email: userEmail,
            platformLinks: platformLinksArray,
            avgViewers: formData.avgViewers,
            discord: formData.discord,
            message: formData.message
          }
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't fail the submission if email fails
      }

      setFormData({
        creatorName: '',
        platformLinks: '',
        avgViewers: '',
        discord: '',
        message: '',
        compensationType: 'revenue_share'
      });

      // Clear saved form data
      localStorage.removeItem(FORM_STORAGE_KEY);

      setShowSuccessModal(true);
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

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate('/fantasy');
  };

  const handleLoginRequiredModalClose = () => {
    setShowLoginRequiredModal(false);
  };

  const handleOpenAuthModal = () => {
    setShowLoginRequiredModal(false);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // Form data is already preserved in localStorage and will be loaded on re-render
    toast({
      title: "Welcome!",
      description: "You can now submit your partner application.",
    });
  };

  const revShareTiers = [
    { 
      name: 'Bronze', 
      percent: 20, 
      requirement: 'Starting tier',
      color: 'from-amber-700 to-amber-900',
      borderColor: 'border-amber-600/30 hover:border-amber-600/60',
      shadowColor: 'hover:shadow-amber-500/20',
      textColor: 'text-amber-500'
    },
    { 
      name: 'Silver', 
      percent: 25, 
      requirement: '50+ referred entries',
      color: 'from-gray-400 to-gray-600',
      borderColor: 'border-gray-400/30 hover:border-gray-400/60',
      shadowColor: 'hover:shadow-gray-400/20',
      textColor: 'text-gray-400'
    },
    { 
      name: 'Gold', 
      percent: 30, 
      requirement: '200+ referred entries',
      color: 'from-yellow-400 to-yellow-600',
      borderColor: 'border-yellow-400/30 hover:border-yellow-400/60',
      shadowColor: 'hover:shadow-yellow-400/20',
      textColor: 'text-yellow-400'
    }
  ];

  const payPerPlayTiers = [
    { 
      name: 'Bronze', 
      amount: 0.50, 
      requirement: 'Starting tier',
      color: 'from-amber-700 to-amber-900',
      borderColor: 'border-amber-600/30 hover:border-amber-600/60',
      shadowColor: 'hover:shadow-amber-500/20',
      textColor: 'text-amber-500'
    },
    { 
      name: 'Silver', 
      amount: 1.00, 
      requirement: '50+ activated users',
      color: 'from-gray-400 to-gray-600',
      borderColor: 'border-gray-400/30 hover:border-gray-400/60',
      shadowColor: 'hover:shadow-gray-400/20',
      textColor: 'text-gray-400'
    },
    { 
      name: 'Gold', 
      amount: 1.50, 
      requirement: '200+ activated users',
      color: 'from-yellow-400 to-yellow-600',
      borderColor: 'border-yellow-400/30 hover:border-yellow-400/60',
      shadowColor: 'hover:shadow-yellow-400/20',
      textColor: 'text-yellow-400'
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <SearchableNavbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 overflow-hidden reveal-on-scroll">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-blue-900/10 to-background" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]" />
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              <Badge variant="outline" className="mb-4 px-4 py-1 border-purple-500/50 text-purple-400">
                <Star className="w-3 h-3 mr-1" />
                Creator Program
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="text-theme-purple">Become </span>
                <span className="text-yellow-400">a </span>
                <span className="text-white">Partner</span>
              </h1>
              <p className="text-xl md:text-2xl text-white mb-8">
                Choose your earning model: <span className="text-yellow-400 font-semibold">20–30% revenue share</span> or <span className="text-green-400 font-semibold">$0.50–$1.50 per activated user</span>
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-white mb-8">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Fixed Prizes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-blue-400" />
                  <span>Skill-Based Only</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  <span>No Gambling</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                <Button 
                  onClick={() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold"
                  size="lg"
                >
                  Apply to Partner Program
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/affiliate-dashboard')}
                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                  size="lg"
                >
                  Partner Login
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-gradient-to-br from-[#0B0F14] to-[#12161C] reveal-on-scroll">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              How It Works
            </h2>
            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { title: 'Apply', desc: 'Submit your application below', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500', textColor: 'text-purple-400', cardBorder: 'border-purple-500/30 hover:border-purple-500/60', shadow: 'hover:shadow-purple-500/20' },
                { title: 'Get Approved', desc: 'We review within 48 hours', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500', textColor: 'text-blue-400', cardBorder: 'border-blue-500/30 hover:border-blue-500/60', shadow: 'hover:shadow-blue-500/20' },
                { title: 'Share Your Link', desc: 'Get your unique referral link', bgColor: 'bg-green-500/20', borderColor: 'border-green-500', textColor: 'text-green-400', cardBorder: 'border-green-500/30 hover:border-green-500/60', shadow: 'hover:shadow-green-500/20' },
                { title: 'Earn Revenue', desc: 'Get paid monthly via PayPal', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500', textColor: 'text-yellow-400', cardBorder: 'border-yellow-500/30 hover:border-yellow-500/60', shadow: 'hover:shadow-yellow-500/20' }
              ].map((step, i) => (
                <Card 
                  key={i} 
                  className={`bg-gradient-to-br from-[#0B0F14] to-[#12161C] ${step.cardBorder} transition-all hover:shadow-lg ${step.shadow} text-center`}
                >
                  <CardContent className="pt-6">
                    <div className={`w-12 h-12 ${step.bgColor} ${step.borderColor} border-2 rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <span className={`text-xl font-bold ${step.textColor}`}>{i + 1}</span>
                    </div>
                    <h3 className="font-semibold mb-1 text-white">{step.title}</h3>
                    <p className="text-sm text-white">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Compensation Options */}
        <section className="py-16 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-background reveal-on-scroll">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
              Choose Your Compensation Model
            </h2>
            <p className="text-center text-white mb-12 max-w-2xl mx-auto">
              We offer two earning models - choose the one that best fits your audience
            </p>
            
            {/* Revenue Share Option */}
            <div className="mb-12">
              <div className="flex items-center justify-center gap-2 mb-6">
                <DollarSign className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl font-bold text-purple-400">Option 1: Revenue Share</h3>
              </div>
              <p className="text-center text-white/70 mb-6">Earn a percentage of every premium contest entry from your referrals, forever</p>
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {revShareTiers.map((tier) => (
                  <Card 
                    key={tier.name} 
                    className={`relative overflow-hidden bg-gradient-to-br from-[#0B0F14] to-[#12161C] ${tier.borderColor} transition-all hover:shadow-lg ${tier.shadowColor}`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-5`} />
                    <CardHeader className="relative">
                      <CardTitle className="flex items-center justify-between text-white">
                        <span>{tier.name}</span>
                        <Trophy className={`w-5 h-5 ${tier.textColor}`} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className={`text-4xl font-bold mb-2 ${tier.textColor}`}>{tier.percent}%</div>
                      <p className="text-sm text-white">Revenue Share</p>
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-sm text-white">{tier.requirement}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Pay Per Play Option */}
            <div>
              <div className="flex items-center justify-center gap-2 mb-6">
                <Users className="w-6 h-6 text-green-400" />
                <h3 className="text-2xl font-bold text-green-400">Option 2: Pay Per Activation</h3>
              </div>
              <p className="text-center text-white/70 mb-6">Earn a fixed amount for each user who registers AND plays their first round (any round type)</p>
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {payPerPlayTiers.map((tier) => (
                  <Card 
                    key={tier.name} 
                    className={`relative overflow-hidden bg-gradient-to-br from-[#0B0F14] to-[#12161C] ${tier.borderColor} transition-all hover:shadow-lg ${tier.shadowColor}`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-5`} />
                    <CardHeader className="relative">
                      <CardTitle className="flex items-center justify-between text-white">
                        <span>{tier.name}</span>
                        <Trophy className={`w-5 h-5 ${tier.textColor}`} />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className={`text-4xl font-bold mb-2 ${tier.textColor}`}>${tier.amount.toFixed(2)}</div>
                      <p className="text-sm text-white">Per Activated User</p>
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-sm text-white">{tier.requirement}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What You Earn From */}
        <section className="py-16 bg-gradient-to-br from-[#0B0F14] to-[#12161C] reveal-on-scroll">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                What Counts as Revenue
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-green-500/30 hover:border-green-500/60 transition-all hover:shadow-lg hover:shadow-green-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      You Earn From
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-green-400 mt-1" />
                      <span className="text-white">Premium contest entry fees</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-green-400 mt-1" />
                      <span className="text-white">Battle pass purchases</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30 hover:border-purple-500/60 transition-all hover:shadow-lg hover:shadow-purple-500/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-400">
                      <Shield className="w-5 h-5" />
                      What Counts as a Referral
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-white">
                    <p>A new user who:</p>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-400 mt-1" />
                      <span>Signs up using your unique referral link</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-400 mt-1" />
                      <span>Is a genuinely new account (no duplicate accounts)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-400 mt-1" />
                      <span>Completes at least one premium contest entry</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-background reveal-on-scroll">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-bold text-center mb-12 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Creator Benefits
            </h2>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { icon: TrendingUp, title: 'Lifetime Earnings', desc: 'Earn from every premium entry your referrals make, forever', color: 'purple' },
                { icon: DollarSign, title: 'Monthly Payouts', desc: 'Get paid via PayPal or bank transfer every month', color: 'yellow' },
                { icon: Trophy, title: 'Tier Progression', desc: 'Increase your rev share as you grow your audience', color: 'blue' }
              ].map((benefit, i) => (
                <Card 
                  key={i} 
                  className={`bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-${benefit.color}-500/30 hover:border-${benefit.color}-500/60 transition-all hover:shadow-lg hover:shadow-${benefit.color}-500/20`}
                >
                  <CardContent className="pt-6 text-center">
                    <div className={`w-12 h-12 bg-${benefit.color}-500/10 rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <benefit.icon className={`w-6 h-6 text-${benefit.color}-400`} />
                    </div>
                    <h3 className="font-semibold mb-2 text-white">{benefit.title}</h3>
                    <p className="text-sm text-white">{benefit.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Application Form */}
        <section className="py-16 bg-gradient-to-br from-[#0B0F14] to-[#12161C] reveal-on-scroll" id="apply">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Apply Now
              </h2>
              <p className="text-center text-white mb-8">
                Join our creator program and start earning today
              </p>
              
              <Card className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30">
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="creatorName" className="text-white">Creator / Channel Name *</Label>
                      <Input
                        id="creatorName"
                        value={formData.creatorName}
                        onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
                        placeholder="Your creator name"
                        required
                        className="bg-background/50 border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="platformLinks" className="text-white">Platform Links *</Label>
                      <Textarea
                        id="platformLinks"
                        value={formData.platformLinks}
                        onChange={(e) => setFormData({ ...formData, platformLinks: e.target.value })}
                        placeholder="https://twitch.tv/yourchannel&#10;https://youtube.com/@yourchannel&#10;https://twitter.com/yourhandle"
                        rows={3}
                        required
                        className="bg-background/50 border-white/10 text-white"
                      />
                      <p className="text-xs text-muted-foreground">One link per line (Twitch, YouTube, Twitter, etc.)</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="avgViewers" className="text-white">Average Viewers / Followers</Label>
                        <Input
                          id="avgViewers"
                          value={formData.avgViewers}
                          onChange={(e) => setFormData({ ...formData, avgViewers: e.target.value })}
                          placeholder="e.g., 500 avg viewers"
                          className="bg-background/50 border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="discord" className="text-white">Discord Username</Label>
                        <Input
                          id="discord"
                          value={formData.discord}
                          onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                          placeholder="username#1234"
                          className="bg-background/50 border-white/10 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-white">Why do you want to partner with us? (Optional)</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us about your content and audience..."
                        rows={3}
                        className="bg-background/50 border-white/10 text-white"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-white">Preferred Compensation Model *</Label>
                      <RadioGroup 
                        value={formData.compensationType} 
                        onValueChange={(value: 'revenue_share' | 'pay_per_play') => setFormData({ ...formData, compensationType: value })}
                        className="space-y-3"
                      >
                        <div className="flex items-start space-x-3 p-3 rounded-lg border border-purple-500/30 hover:border-purple-500/50 transition-colors cursor-pointer" onClick={() => setFormData({ ...formData, compensationType: 'revenue_share' })}>
                          <RadioGroupItem value="revenue_share" id="revenue_share" className="mt-1" />
                          <div>
                            <Label htmlFor="revenue_share" className="text-white font-semibold cursor-pointer">Revenue Share (20-30%)</Label>
                            <p className="text-sm text-white/70">Earn a percentage of every premium entry fee from your referrals, forever</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 rounded-lg border border-green-500/30 hover:border-green-500/50 transition-colors cursor-pointer" onClick={() => setFormData({ ...formData, compensationType: 'pay_per_play' })}>
                          <RadioGroupItem value="pay_per_play" id="pay_per_play" className="mt-1" />
                          <div>
                            <Label htmlFor="pay_per_play" className="text-green-400 font-semibold cursor-pointer">Pay Per Activation ($0.50-$1.50)</Label>
                            <p className="text-sm text-white/70">Earn a fixed amount for each user who registers AND plays their first round</p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold"
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

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={handleSuccessModalClose}>
        <DialogContent className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30 text-white max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Application Submitted!
            </DialogTitle>
            <DialogDescription className="text-center text-white mt-2">
              Thank you for applying to our Partner Program. We'll review your application and get back to you within 48 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <Button 
              onClick={handleSuccessModalClose}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold"
            >
              Continue to Fantasy
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Required Modal */}
      <Dialog open={showLoginRequiredModal} onOpenChange={handleLoginRequiredModalClose}>
        <DialogContent className="bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-purple-500/30 text-white max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-purple-500/20 border-2 border-purple-500 rounded-full flex items-center justify-center">
                <LogIn className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Account Required
            </DialogTitle>
            <DialogDescription className="text-center text-white mt-2">
              You need to create an account or login before applying to become a partner. Your application details will be saved.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-3">
            <Button 
              onClick={handleOpenAuthModal}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold"
            >
              Create Account / Login
            </Button>
            <Button 
              variant="outline"
              onClick={handleLoginRequiredModalClose}
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default AffiliateProgramPage;
