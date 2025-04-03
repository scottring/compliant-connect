import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger, Alert, AlertDescription } from "@/components/ui";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
<<<<<<< Updated upstream
  
=======
  const [activeTab, setActiveTab] = useState<string>("login");

>>>>>>> Stashed changes
  // Form state
  const [activeTab, setActiveTab] = useState<string>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  // Get the intended destination from location state, or default to dashboard
  const from = location.state?.from?.pathname || "/dashboard";

  // Handle successful authentication
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  // Clear error when switching tabs
  useEffect(() => {
    setError(null);
  }, [activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    console.log('handleLogin')
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      console.log('missing fields')
      setError("Please fill in all fields");
      return;
    }
<<<<<<< Updated upstream
    
    try {
      setIsSubmitting(true);
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        throw signInError;
      }
      
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.message?.includes("Invalid login credentials")) {
        setError("Invalid email or password");
      } else {
        setError(error.message || "Failed to sign in");
      }
    } finally {
      setIsSubmitting(false);
    }
=======

    setIsSubmitting(true);
    console.log('before signIn')
    void signIn(email, password);
    console.log('after signIn')

    // Add a small delay to ensure the user data is fully loaded
    await new Promise(resolve => setTimeout(resolve, 300));

    // Explicitly navigate after successful login
    // This ensures redirection even if the useEffect doesn't trigger
    console.log("Login successful, redirecting to:", from);
    navigate(from, { replace: true });
    setIsSubmitting(false);
>>>>>>> Stashed changes
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !firstName || !lastName) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const { error: signUpError } = await signUp(email, password, firstName, lastName);
      
      if (signUpError) {
        throw signUpError;
      }
      
      setEmailConfirmationSent(true);
      toast.success("Account created! Please check your email for confirmation.");
    } catch (error: any) {
      console.error("Sign up error:", error);
      setError(error.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: window.location.origin + "/email-confirmation",
        },
      });

      if (error) throw error;

      toast.success("Confirmation email resent. Please check your inbox.");
    } catch (error: any) {
      console.error("Error resending confirmation email:", error);
      setError(error.message || "Failed to resend confirmation email");
    } finally {
      setIsSubmitting(false);
    }
  };
<<<<<<< Updated upstream

  // Simplified loading spinner logic
  const showSpinner = isSubmitting;
=======
  console.log("loading", loading)
  if (loading) {
    console.log("authLoading")
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
>>>>>>> Stashed changes

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="text-center">
<<<<<<< Updated upstream
=======
          <img
            src="/lovable-uploads/c2472b5a-b16b-4f53-9ea4-eb27391a2e5b.png"
            alt="StacksData Logo"
            className="h-12 mx-auto mb-4"
          />
>>>>>>> Stashed changes
          <h1 className="text-2xl font-bold tracking-tight">Product Compliance Platform</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your account or create a new one
          </p>
        </div>

        {emailConfirmationSent && (
          <Alert className="mb-4">
            <AlertDescription>
              A confirmation email has been sent. Please check your inbox and click the link to verify your email.
              <Button
                variant="link"
                onClick={handleResendConfirmation}
                disabled={isSubmitting}
                className="p-0 ml-2 h-auto"
              >
                Resend confirmation email
              </Button>
            </AlertDescription>
          </Alert>
        )}

<<<<<<< Updated upstream
        {showSpinner ? (
          <div className="text-center py-8">
            <div className="h-12 w-12 mx-auto border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-600">Processing...</p>
          </div>
        ) : (
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="your@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
=======
        <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
>>>>>>> Stashed changes
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="space-y-2">
<<<<<<< Updated upstream
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
=======
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
>>>>>>> Stashed changes
                    disabled={isSubmitting}
                    required
                  />
                </div>
<<<<<<< Updated upstream
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  Sign In
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="your@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
=======
              </div>

              <div className="space-y-2">
                <Label htmlFor="registerEmail">Email</Label>
                <Input
                  id="registerEmail"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registerPassword">Password</Label>
                <Input
                  id="registerPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
>>>>>>> Stashed changes
      </div>
    </div>
  );
};

export default Auth;
