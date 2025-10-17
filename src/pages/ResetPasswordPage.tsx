import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const ResetPasswordPage: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Verify we have a valid session after token exchange
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Invalid or expired reset link. Please request a new password reset.');
      }
    };
    
    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate password match
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match. Please try again.");
      setLoading(false);
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        setError(updateError.message);
        toast({
          title: "Password reset failed",
          description: updateError.message,
          variant: "destructive",
        });
      } else {
        setSuccess(true);
        toast({
          title: "Password reset successful!",
          description: "You can now sign in with your new password.",
        });
        
        // Redirect to auth page after 2 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      toast({
        title: "Error",
        description: err.message || 'An unexpected error occurred',
        variant: "destructive",
      });
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
              Reset Your Password
            </CardTitle>
            <p className="text-sm text-gray-300 mt-2">
              Enter your new password below
            </p>
          </CardHeader>
          <CardContent>
            {success ? (
              <Alert className="bg-green-950/50 border-green-800">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">
                  Password reset successful! Redirecting to sign in...
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="bg-red-950/50 border-red-800 text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-gray-300">
                    <Lock className="inline w-4 h-4 mr-2" />
                    New Password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-theme-gray-dark border-theme-gray-light text-white"
                    placeholder="Enter new password (min 6 characters)"
                    disabled={loading || !!error}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-gray-300">
                    <Lock className="inline w-4 h-4 mr-2" />
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-theme-gray-dark border-theme-gray-light text-white"
                    placeholder="Confirm new password"
                    disabled={loading || !!error}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-theme-purple hover:bg-theme-purple/90"
                  disabled={loading || !!error}
                >
                  {loading ? 'Updating password...' : 'Reset Password'}
                </Button>

                {error && (
                  <div className="text-center">
                    <Button 
                      asChild
                      variant="link" 
                      className="text-theme-purple hover:text-theme-purple/80"
                    >
                      <Link to="/auth">Request a new reset link</Link>
                    </Button>
                  </div>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
