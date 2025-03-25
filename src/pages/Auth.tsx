
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

const Auth = () => {
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("login");
  
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  useEffect(() => {
    // Redirect if user is already authenticated
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    try {
      setIsSubmitting(true);
      await signIn(email, password);
      // No need to navigate here, the auth state change will trigger the useEffect
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Special handling for unconfirmed email
      if (error.message === "Email not confirmed") {
        setError("Please confirm your email before signing in. Check your inbox for the confirmation link.");
      } else {
        setError(error.message || "Failed to sign in");
      }
    } finally {
      setIsSubmitting(false);
    }
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
      await signUp(email, password, firstName, lastName);
      setEmailConfirmationSent(true);
      toast.success("Account created successfully! Please check your email for confirmation.");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <img 
            src="/lovable-uploads/c2472b5a-b16b-4f53-9ea4-eb27391a2e5b.png" 
            alt="StacksData Logo" 
            className="h-12 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold tracking-tight">Product Compliance Platform</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your account or create a new one
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
      </div>
    </div>
  );
};

export default Auth;
