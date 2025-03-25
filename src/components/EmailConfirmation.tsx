
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const EmailConfirmation = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the token and type from the URL
        const params = new URLSearchParams(location.hash.substring(1));
        const accessToken = params.get("access_token");
        const tokenType = params.get("token_type");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        if (!accessToken || !tokenType || !type) {
          setError("Invalid confirmation link. Please try again or request a new confirmation email.");
          setLoading(false);
          return;
        }

        // For email confirmation flow
        if (type === "recovery" || type === "signup") {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          if (error) {
            throw error;
          }

          setSuccess(true);
          setTimeout(() => {
            navigate("/auth");
          }, 3000);
        }
      } catch (error: any) {
        console.error("Email confirmation error:", error);
        setError(error.message || "An error occurred during email confirmation");
      } finally {
        setLoading(false);
      }
    };

    // Run the confirmation process
    handleEmailConfirmation();
  }, [location, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
      <div className="w-full max-w-md space-y-6 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <img 
            src="/lovable-uploads/c2472b5a-b16b-4f53-9ea4-eb27391a2e5b.png" 
            alt="StacksData Logo" 
            className="h-12 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold tracking-tight">Email Confirmation</h1>
        </div>

        {loading && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Your email has been confirmed successfully! You will be redirected to the login page.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="flex justify-center pt-4">
          <Button onClick={() => navigate("/auth")}>
            Go to Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;
