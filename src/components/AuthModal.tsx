import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpFullName, setSignUpFullName] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp, resetPassword, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && isOpen) {
      onClose();
      onSuccess?.();
    }
  }, [user, isOpen, onClose, onSuccess]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(signInEmail, signInPassword);
    
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpPassword !== signUpConfirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (signUpPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
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
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    }
    
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await resetPassword(resetEmail);
    
    if (error) {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reset link sent!",
        description: "Please check your email for the password reset link.",
      });
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-theme-gray-medium border-theme-gray-light max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-gaming text-white text-center">
            Welcome to <span className="text-theme-purple">EsportsHub</span>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="signin" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-theme-gray-dark">
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
            <TabsTrigger 
              value="reset"
              className="data-[state=active]:bg-theme-purple data-[state=active]:text-white"
            >
              Reset
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
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
              </div>

              <Button 
                type="submit" 
                className="w-full bg-theme-purple hover:bg-theme-purple/90"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
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

          <TabsContent value="reset" className="space-y-4">
            <form onSubmit={handleResetPassword} className="space-y-4">
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

              <Button 
                type="submit" 
                className="w-full bg-theme-purple hover:bg-theme-purple/90"
                disabled={loading}
              >
                {loading ? 'Sending reset link...' : 'Send Reset Link'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;