import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
const loginBanner = "/lovable-uploads/Spend_5_Get_10.webp";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultTab?: 'signin' | 'signup';
}

// Check if user has ever logged in before (stored in localStorage)
const hasLoggedInBefore = (): boolean => {
  return localStorage.getItem('has_logged_in') === 'true';
};

// Mark that user has logged in
const markAsLoggedIn = (): void => {
  localStorage.setItem('has_logged_in', 'true');
};

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, defaultTab }) => {
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [signUpError, setSignUpError] = useState('');
  const [resetError, setResetError] = useState('');
  
  // Marketing preferences and T&Cs
  const [marketingPreferences, setMarketingPreferences] = useState({
    product_updates: false,
    event_notifications: false
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Field validation states
  const [fieldErrors, setFieldErrors] = useState({
    email: ''
  });
  const [fieldValidation, setFieldValidation] = useState({
    email: null as boolean | null
  });
  const [checking, setChecking] = useState(false);

  // Generate username from email
  const generateUsername = (email: string): string => {
    const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${randomSuffix}`.slice(0, 50);
  };
  
  const { signIn, signUp, resetPassword, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && isOpen) {
      onClose();
      onSuccess?.();
    }
  }, [user, isOpen, onClose, onSuccess]);

  // Real-time duplicate checking with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (signUpEmail) {
        checkDuplicates();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [signUpEmail]);

  const checkDuplicates = async () => {
    if (!signUpEmail) return;
    
    setChecking(true);
    try {
      const { data } = await supabase.functions.invoke('check-duplicates', {
        body: {
          email: signUpEmail || null,
          username: null,
          full_name: null
        }
      });

      if (data?.duplicates) {
        const newErrors = {
          email: data.duplicates.email ? 'This email is already registered' : ''
        };
        
        const newValidation = {
          email: signUpEmail ? !data.duplicates.email : null
        };

        setFieldErrors(newErrors);
        setFieldValidation(newValidation);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSignInError('');

    const { error } = await signIn(signInEmail, signInPassword);
    
    if (error) {
      const errorMessage = error.message;
      setSignInError(errorMessage);
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      setSignInError('');
      markAsLoggedIn(); // Mark user as returning user
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError('');
    
    // Validate T&Cs acceptance
    if (!termsAccepted) {
      const errorMessage = "You must accept the Terms & Conditions to create an account.";
      setSignUpError(errorMessage);
      toast({
        title: "Terms & Conditions required",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    // Check for field errors
    const hasErrors = Object.values(fieldErrors).some(error => error !== '');
    if (hasErrors) {
      const errorMessage = "Please fix the highlighted errors before continuing.";
      setSignUpError(errorMessage);
      toast({
        title: "Form validation failed",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }
    
    if (signUpPassword !== signUpConfirmPassword) {
      const errorMessage = "Please make sure your passwords match.";
      setSignUpError(errorMessage);
      toast({
        title: "Password mismatch",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    if (signUpPassword.length < 6) {
      const errorMessage = "Password must be at least 6 characters long.";
      setSignUpError(errorMessage);
      toast({
        title: "Password too short",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const autoGeneratedUsername = generateUsername(signUpEmail);

    const { error } = await signUp(signUpEmail, signUpPassword, {
      username: autoGeneratedUsername,
      marketing_preferences: JSON.stringify(marketingPreferences),
      terms_accepted: termsAccepted
    });
    
    if (error) {
      const errorMessage = error.message;
      setSignUpError(errorMessage);
      toast({
        title: "Sign up failed",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      setSignUpError('');
      markAsLoggedIn(); // Mark user as returning user after successful signup
      toast({
        title: "Account created successfully!",
        description: "Welcome to EsportsHub! Please check your email to verify your account.",
      });
      
      // Clear form
      setSignUpEmail('');
      setSignUpPassword('');
      setSignUpConfirmPassword('');
      setMarketingPreferences({
        product_updates: false,
        event_notifications: false
      });
      setTermsAccepted(false);
      setFieldErrors({ email: '' });
      setFieldValidation({ email: null });
      
      // Close modal and handle success
      onClose();
      onSuccess?.();
    }
    
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetError('');

    const { error } = await resetPassword(resetEmail);
    
    if (error) {
      const errorMessage = error.message;
      setResetError(errorMessage);
      toast({
        title: "Reset failed",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      setResetError('');
      toast({
        title: "Reset link sent!",
        description: "Please check your email for the password reset link.",
      });
      setResetEmailSent(true);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-theme-gray-medium border-theme-gray-light max-w-md">
        <DialogHeader className="p-0">
          <img 
            src={loginBanner} 
            alt="Welcome - Spend $5 Get $10 Free! New users first $5 of paid entries unlocks $10 in bonus credits" 
            className="w-full h-auto rounded-t-lg"
          />
        </DialogHeader>
        
        <Tabs defaultValue={defaultTab || (hasLoggedInBefore() ? 'signin' : 'signup')} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-theme-gray-dark">
            <TabsTrigger 
              value="signin" 
              className="data-[state=active]:bg-theme-purple data-[state=active]:text-white"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="data-[state=active]:bg-theme-purple data-[state=active]:text-white"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            {!showResetForm ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                {signInError && (
                  <Alert variant="destructive" className="bg-red-950/50 border-red-800 text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{signInError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-gray-300">
                    <Mail className="inline w-4 h-4 mr-2" />
                    Email
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                    className="bg-theme-gray-dark border-theme-gray-light text-white"
                    placeholder="Enter your email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-gray-300">
                    <Lock className="inline w-4 h-4 mr-2" />
                    Password
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                    className="bg-theme-gray-dark border-theme-gray-light text-white"
                    placeholder="Enter your password"
                  />
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowResetForm(true)}
                      className="text-sm text-theme-purple hover:text-theme-purple/80 underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-theme-purple hover:bg-theme-purple/90"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <Alert variant="destructive" className="bg-red-950/50 border-red-800 text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{resetError}</AlertDescription>
                  </Alert>
                )}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-white">Reset Password</h3>
                  <p className="text-sm text-gray-300">Enter your email to receive a reset link</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-gray-300">
                    <Mail className="inline w-4 h-4 mr-2" />
                    Email
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="bg-theme-gray-dark border-theme-gray-light text-white"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setShowResetForm(false)}
                    className="flex-1 border-theme-gray-light text-gray-300 hover:text-white"
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-theme-purple hover:bg-theme-purple/90"
                    disabled={loading || resetEmailSent}
                  >
                    {resetEmailSent ? 'Sent' : loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              {signUpError && (
                <Alert variant="destructive" className="bg-red-950/50 border-red-800 text-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{signUpError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-gray-300">
                  <Mail className="inline w-4 h-4 mr-2" />
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="signup-email"
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    className={`bg-theme-gray-dark border-theme-gray-light text-white pr-8 ${
                      fieldErrors.email ? 'border-red-500' : 
                      fieldValidation.email === true ? 'border-green-500' : ''
                    }`}
                    placeholder="Enter your email"
                  />
                  {checking ? (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-purple"></div>
                    </div>
                  ) : fieldValidation.email === true ? (
                    <CheckCircle2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                  ) : fieldValidation.email === false ? (
                    <X className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                  ) : null}
                </div>
                {fieldErrors.email && (
                  <p className="text-sm text-red-400">{fieldErrors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-gray-300">
                  <Lock className="inline w-4 h-4 mr-2" />
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  required
                  className="bg-theme-gray-dark border-theme-gray-light text-white"
                  placeholder="Create a password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password" className="text-gray-300">
                  <Lock className="inline w-4 h-4 mr-2" />
                  Confirm Password
                </Label>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  value={signUpConfirmPassword}
                  onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                  required
                  className="bg-theme-gray-dark border-theme-gray-light text-white"
                  placeholder="Confirm your password"
                />
              </div>

              {/* Marketing Preferences */}
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm font-medium">
                  Marketing Preferences (Optional)
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="product-updates"
                      checked={marketingPreferences.product_updates}
                      onCheckedChange={(checked) => 
                        setMarketingPreferences(prev => ({
                          ...prev,
                          product_updates: checked as boolean
                        }))
                      }
                      className="border-theme-gray-light data-[state=checked]:bg-theme-purple"
                    />
                    <Label htmlFor="product-updates" className="text-sm text-gray-300">
                      Product updates and new features
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="event-notifications"
                      checked={marketingPreferences.event_notifications}
                      onCheckedChange={(checked) => 
                        setMarketingPreferences(prev => ({
                          ...prev,
                          event_notifications: checked as boolean
                        }))
                      }
                      className="border-theme-gray-light data-[state=checked]:bg-theme-purple"
                    />
                    <Label htmlFor="event-notifications" className="text-sm text-gray-300">
                      Tournament and event notifications
                    </Label>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms-accepted"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    className="border-theme-gray-light data-[state=checked]:bg-theme-purple mt-0.5"
                    required
                  />
                  <Label htmlFor="terms-accepted" className="text-sm text-gray-300 leading-relaxed">
                    I agree to the{' '}
                    <a href="/legal/terms" target="_blank" className="text-theme-purple hover:text-theme-purple/80 underline">
                      Terms & Conditions
                    </a>
                    {' '}and{' '}
                    <a href="/legal/privacy" target="_blank" className="text-theme-purple hover:text-theme-purple/80 underline">
                      Privacy Policy
                    </a>
                    <span className="text-red-400 ml-1">*</span>
                  </Label>
                </div>
                {!termsAccepted && signUpError && (
                  <p className="text-sm text-red-400">Terms & Conditions acceptance is required</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-theme-purple hover:bg-theme-purple/90"
                disabled={loading || !termsAccepted || Object.values(fieldErrors).some(error => error !== '')}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;