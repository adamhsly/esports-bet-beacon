import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Lock, User, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
const loginBanner = "/lovable-uploads/Spend_5_Get_10_v5.png";

// Check if user has ever logged in before (stored in localStorage)
const hasLoggedInBefore = (): boolean => {
  return localStorage.getItem('has_logged_in') === 'true';
};

// Mark that user has logged in
const markAsLoggedIn = (): void => {
  localStorage.setItem('has_logged_in', 'true');
};

const AuthPage: React.FC = () => {
  // Mark welcome page as seen when auth page is accessed
  useEffect(() => {
    localStorage.setItem('hasSeenWelcome', 'true');
  }, []);
  
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signInError, setSignInError] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const [resetError, setResetError] = useState("");

  // Marketing preferences
  const [acceptMarketing, setAcceptMarketing] = useState(true);

  // Field validation states
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
  });
  const [fieldValidation, setFieldValidation] = useState({
    email: null as boolean | null,
  });
  const [checking, setChecking] = useState(false);

  // Generate username from email
  const generateUsername = (email: string): string => {
    const prefix = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `${prefix}${randomSuffix}`.slice(0, 50);
  };

  const { signIn, signUp, resetPassword, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const tabFromParam = searchParams.get("tab");
  const defaultTab = tabFromParam === "signup" ? "signup" : tabFromParam === "signin" ? "signin" : (hasLoggedInBefore() ? "signin" : "signup");
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Generate dropdown options
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    { value: "01", label: "Jan" },
    { value: "02", label: "Feb" },
    { value: "03", label: "Mar" },
    { value: "04", label: "Apr" },
    { value: "05", label: "May" },
    { value: "06", label: "Jun" },
    { value: "07", label: "Jul" },
    { value: "08", label: "Aug" },
    { value: "09", label: "Sep" },
    { value: "10", label: "Oct" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dec" },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    if (user && !authLoading) {
      navigate(redirectTo);
    }
  }, [user, authLoading, navigate, redirectTo]);

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
    // Only check if we have a valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!signUpEmail || !emailRegex.test(signUpEmail.trim())) return;

    setChecking(true);
    try {
      const { data } = await supabase.functions.invoke("check-duplicates", {
        body: {
          email: signUpEmail || null,
          username: null,
          full_name: null,
        },
      });

      if (data?.duplicates) {
        const newErrors = {
          email: data.duplicates.email ? "This email is already registered" : "",
        };

        const newValidation = {
          email: signUpEmail ? !data.duplicates.email : null,
        };

        setFieldErrors(newErrors);
        setFieldValidation(newValidation);
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
    } finally {
      setChecking(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSignInError("");

    const { error } = await signIn(signInEmail, signInPassword);

    if (error) {
      const errorMessage = error.message;
      setSignInError(errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      setSignInError("");
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
    setSignUpError("");

    // Check for field errors
    const hasErrors = Object.values(fieldErrors).some((error) => error !== "");
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

    // Validate date of birth
    if (!dobDay || !dobMonth || !dobYear) {
      const errorMessage = "Please select your complete date of birth";
      setSignUpError(errorMessage);
      toast({
        title: "Date of birth required",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    // Combine date of birth into YYYY-MM-DD format
    const dateOfBirth = `${dobYear}-${dobMonth}-${dobDay.padStart(2, '0')}`;

    // Validate date is valid
    const dobDate = new Date(dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      const errorMessage = "Please enter a valid date of birth";
      setSignUpError(errorMessage);
      toast({
        title: "Invalid date",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    // Validate age is 18 or older
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    if (age < 18) {
      const errorMessage = "You must be 18 or older to create an account.";
      setSignUpError(errorMessage);
      toast({
        title: "Age requirement not met",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const autoGeneratedUsername = generateUsername(signUpEmail);

    const { error } = await signUp(signUpEmail, signUpPassword, {
      username: autoGeneratedUsername,
      date_of_birth: dateOfBirth,
      marketing_preferences: JSON.stringify({ product_updates: acceptMarketing, event_notifications: acceptMarketing }),
      terms_accepted: true,
    });

    if (error) {
      const errorMessage = error.message;
      setSignUpError(errorMessage);
      toast({
        title: "Account creation failed",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      setSignUpError("");
      markAsLoggedIn(); // Mark user as returning user after successful signup
      toast({
        title: "Account created successfully!",
        description: "Welcome to EsportsHub! Please check your email to verify your account.",
      });

      // Clear form and navigate to homepage
      setSignUpEmail("");
      setSignUpPassword("");
      setDobDay("");
      setDobMonth("");
      setDobYear("");
      setAcceptMarketing(true);
      
      setFieldErrors({ email: "" });
      setFieldValidation({ email: null });
      navigate("/");
    }

    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetError("");

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
      setResetError("");
      toast({
        title: "Reset link sent!",
        description: "Please check your email for the password reset link.",
      });
      setResetEmailSent(true);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-theme-gray-dark flex items-center justify-center p-4 pb-32 md:pb-4">
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
          <CardHeader className="p-0 pb-4">
            <img 
              src={loginBanner} 
              alt="$10 bonus - No deposit required - Have some free plays on us!" 
              className="w-full h-auto rounded-t-lg"
            />
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-theme-gray-dark">
                <TabsTrigger
                  value="signin"
                  className="data-[state=active]:bg-theme-purple data-[state=active]:text-white"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="data-[state=active]:bg-theme-purple data-[state=active]:text-white"
                >
                  Create Account
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
                      {loading ? "Logging in..." : "Login"}
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
                        {resetEmailSent ? "Sent" : loading ? "Sending..." : "Send Reset Link"}
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
                          fieldErrors.email
                            ? "border-red-500"
                            : fieldValidation.email === true
                              ? "border-green-500"
                              : ""
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
                      <p className="text-sm text-red-400">
                        {fieldErrors.email}{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("signin");
                            setSignInEmail(signUpEmail);
                          }}
                          className="text-theme-purple hover:text-theme-purple/80 underline"
                        >
                          Log in
                        </button>
                      </p>
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

                  {/* Date of Birth Field */}
                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      <User className="inline w-4 h-4 mr-2" />
                      Date of Birth
                    </Label>
                    <div className="flex gap-2">
                      <Select value={dobDay} onValueChange={setDobDay}>
                        <SelectTrigger className="flex-1 bg-theme-gray-dark border-theme-gray-light text-white">
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          {days.map((day) => (
                            <SelectItem key={day} value={day}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={dobMonth} onValueChange={setDobMonth}>
                        <SelectTrigger className="flex-1 bg-theme-gray-dark border-theme-gray-light text-white">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          {months.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={dobYear} onValueChange={setDobYear}>
                        <SelectTrigger className="flex-1 bg-theme-gray-dark border-theme-gray-light text-white">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-50">
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Marketing preferences checkbox */}
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="marketing-page"
                      checked={acceptMarketing}
                      onCheckedChange={(checked) => setAcceptMarketing(checked === true)}
                      className="mt-0.5 border-gray-500 data-[state=checked]:bg-theme-purple data-[state=checked]:border-theme-purple"
                    />
                    <Label htmlFor="marketing-page" className="text-xs text-gray-400 cursor-pointer leading-tight">
                      I want to receive marketing communications about promotions, offers and updates
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] hover:from-[#A78BFA] hover:to-[#22D3EE] text-white shadow-lg shadow-[#8B5CF6]/30 hover:shadow-[#8B5CF6]/50 transition-all active:scale-[0.99]"
                    disabled={loading || Object.values(fieldErrors).some((error) => error !== "")}
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>

                  {/* Terms & Conditions disclaimer */}
                  <p className="text-xs text-gray-400 text-center leading-relaxed">
                    By clicking Create Account I agree to the{" "}
                    <a
                      href="/legal/terms"
                      target="_blank"
                      className="text-theme-purple hover:text-theme-purple/80 underline"
                    >
                      Terms & Conditions
                    </a>{" "}
                    and{" "}
                    <a
                      href="/legal/privacy"
                      target="_blank"
                      className="text-theme-purple hover:text-theme-purple/80 underline"
                    >
                      Privacy Policy
                    </a>
                    <span className="text-red-400 ml-0.5">*</span>
                  </p>

                  <p className="text-xs text-gray-500 text-center">
                    You must be 18 or older to create an account.
                  </p>
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
