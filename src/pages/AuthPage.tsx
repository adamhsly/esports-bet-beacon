
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Lock, User, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AuthPage: React.FC = () => {
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpFullName, setSignUpFullName] = useState('');
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
    email: '',
    username: '',
    full_name: ''
  });
  const [fieldValidation, setFieldValidation] = useState({
    email: null as boolean | null,
    username: null as boolean | null,
    full_name: null as boolean | null
  });
  const [checking, setChecking] = useState(false);
  
  const { signIn, signUp, resetPassword, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (user) {
      navigate(redirectTo);
    }
  }, [user, navigate, redirectTo]);

  // Real-time duplicate checking with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (signUpEmail || signUpUsername || signUpFullName) {
        checkDuplicates();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [signUpEmail, signUpUsername, signUpFullName]);

  const checkDuplicates = async () => {
    if (!signUpEmail && !signUpUsername && !signUpFullName) return;
    
    setChecking(true);
    try {
      const { data } = await supabase.functions.invoke('check-duplicates', {
        body: {
          email: signUpEmail || null,
          username: signUpUsername || null,
          full_name: signUpFullName || null
        }
      });

      if (data?.duplicates) {
        const newErrors = {
          email: data.duplicates.email ? 'This email is already registered' : '',
          username: data.duplicates.username ? 'This username is already taken' : '',
          full_name: data.duplicates.full_name ? 'This name is already registered' : ''
        };
        
        const newValidation = {
          email: signUpEmail ? !data.duplicates.email : null,
          username: signUpUsername ? !data.duplicates.username : null,
          full_name: signUpFullName ? !data.duplicates.full_name : null
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

    const { error } = await signUp(signUpEmail, signUpPassword, {
      username: signUpUsername,
      full_name: signUpFullName,
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
      toast({
        title: "Account created successfully!",
        description: "Welcome to EsportsHub! Please check your email to verify your account.",
      });
      
      // Clear form and navigate to homepage
      setSignUpEmail('');
      setSignUpPassword('');
      setSignUpConfirmPassword('');
      setSignUpUsername('');
      setSignUpFullName('');
      setMarketingPreferences({
        product_updates: false,
        event_notifications: false
      });
      setTermsAccepted(false);
      setFieldErrors({ email: '', username: '', full_name: '' });
      setFieldValidation({ email: null, username: null, full_name: null });
      navigate('/');
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
    <div className="min-h-screen bg-theme-gray-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <Link to="/">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <Card className="bg-theme-gray-medium border-theme-gray-light">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-gaming text-white">
              Welcome to <span className="text-theme-purple">Frags and Fortunes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
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
                    <Label htmlFor="signup-fullname" className="text-gray-300">
                      <User className="inline w-4 h-4 mr-2" />
                      Full Name
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-fullname"
                        type="text"
                        value={signUpFullName}
                        onChange={(e) => setSignUpFullName(e.target.value)}
                        className={`bg-theme-gray-dark border-theme-gray-light text-white pr-8 ${
                          fieldErrors.full_name ? 'border-red-500' : 
                          fieldValidation.full_name === true ? 'border-green-500' : ''
                        }`}
                        placeholder="Enter your full name"
                      />
                      {checking ? (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-purple"></div>
                        </div>
                      ) : fieldValidation.full_name === true ? (
                        <CheckCircle2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                      ) : fieldValidation.full_name === false ? (
                        <X className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                      ) : null}
                    </div>
                    {fieldErrors.full_name && (
                      <p className="text-sm text-red-400">{fieldErrors.full_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-username" className="text-gray-300">
                      <User className="inline w-4 h-4 mr-2" />
                      Username
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-username"
                        type="text"
                        value={signUpUsername}
                        onChange={(e) => setSignUpUsername(e.target.value)}
                        className={`bg-theme-gray-dark border-theme-gray-light text-white pr-8 ${
                          fieldErrors.username ? 'border-red-500' : 
                          fieldValidation.username === true ? 'border-green-500' : ''
                        }`}
                        placeholder="Choose a username"
                      />
                      {checking ? (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-theme-purple"></div>
                        </div>
                      ) : fieldValidation.username === true ? (
                        <CheckCircle2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                      ) : fieldValidation.username === false ? (
                        <X className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                      ) : null}
                    </div>
                    {fieldErrors.username && (
                      <p className="text-sm text-red-400">{fieldErrors.username}</p>
                    )}
                  </div>
                  
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
