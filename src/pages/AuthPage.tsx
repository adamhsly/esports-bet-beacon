
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

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
      full_name: signUpFullName
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
              Welcome to <span className="text-theme-purple">EsportsHub</span>
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
                    <Input
                      id="signup-fullname"
                      type="text"
                      value={signUpFullName}
                      onChange={(e) => setSignUpFullName(e.target.value)}
                      className="bg-theme-gray-dark border-theme-gray-light text-white"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-username" className="text-gray-300">
                      <User className="inline w-4 h-4 mr-2" />
                      Username
                    </Label>
                    <Input
                      id="signup-username"
                      type="text"
                      value={signUpUsername}
                      onChange={(e) => setSignUpUsername(e.target.value)}
                      className="bg-theme-gray-dark border-theme-gray-light text-white"
                      placeholder="Choose a username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-300">
                      <Mail className="inline w-4 h-4 mr-2" />
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                      className="bg-theme-gray-dark border-theme-gray-light text-white"
                      placeholder="Enter your email"
                    />
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

                  <Button 
                    type="submit" 
                    className="w-full bg-theme-purple hover:bg-theme-purple/90"
                    disabled={loading}
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
