import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

type PasswordFormData = z.infer<typeof passwordSchema>;

const InviteRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false); // Track if token verification was successful

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirmPassword: '', firstName: '', lastName: '' },
  });

  // Handle token verification on component mount
  // Handle session check after invite redirect OR token verification from hash
  useEffect(() => {
    const handleAuth = async () => {
      setLoading(true);
      setError(null);
      setIsVerified(false); // Reset verification status

      // Priority 1: Check for existing session (Supabase sets this after invite link click)
      const { data: { session }, error: getSessionError } = await supabase.auth.getSession();

      if (getSessionError) {
        console.error("Error getting current session:", getSessionError);
        setError("Failed to check authentication status.");
      } else if (session?.user) {
        // User is logged in, likely after clicking the invite link.
        // Supabase handles the 'invite' type confirmation implicitly via the ConfirmationURL.
        console.log("Session found, user likely verified invite.", session.user.email);
        setEmail(session.user.email || null);
        setIsVerified(true); // Assume verified as session exists post-invite-click
      } else {
        // Priority 2: No session, check for tokens in hash (Password Recovery flow)
        const hash = location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type'); // Should be 'recovery'

        if (accessToken && refreshToken && type === 'recovery') {
          console.log("Tokens found in hash, attempting recovery flow session set.");
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError || !sessionData.session || !sessionData.user) {
            console.error("Error setting session from URL hash:", sessionError);
            setError("Failed to verify link parameters. Link might be expired or invalid.");
          } else {
            console.log("Session set successfully from hash tokens.", sessionData.user.email);
            setEmail(sessionData.user.email || null);
            setIsVerified(true);
            navigate(location.pathname, { replace: true }); // Clear hash
          }
        } else if (location.hash) {
            // Hash exists but doesn't contain valid recovery tokens
             console.log("Hash detected, but invalid parameters for recovery/invite.");
             setError("Invalid or incomplete link parameters.");
        } else {
          // No session and no tokens in hash - invalid access
          console.log("No session or valid hash tokens found.");
          setError("Invalid access. Please use the link from your email.");
        }
      }
      setLoading(false);
    };

    handleAuth();
  }, []); // Run only on mount

  const onSubmit = async (data: PasswordFormData) => {
    if (!isVerified) {
        toast.error("Cannot submit form. Verification failed or link is invalid.");
        return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Update the user's password (this confirms the invite)
      const { error: passwordError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (passwordError) {
        throw new Error(`Failed to set password: ${passwordError.message}`);
      }

      // 2. Update the user's profile with first/last name
      // Get the user ID from the current session (should exist after updateUser)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          throw new Error("Could not retrieve user information after password update.");
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          updated_at: new Date().toISOString(), // Explicitly set updated_at
        })
        .eq('id', user.id); // Match the profile to the user ID

      if (profileError) {
        // Log profile error but proceed, password was set. User might need manual profile update.
        console.error("Password set, but failed to update profile:", profileError);
        toast.warning("Password set, but failed to update profile details.");
      } else {
        toast.success("Profile updated!");
      }

      // 3. Create Company Relationship
      const customerCompanyId = user.app_metadata?.invited_to_company_id;
      const supplierCompanyId = user.app_metadata?.invited_supplier_company_id; // Get supplier ID from metadata

      if (!customerCompanyId || !supplierCompanyId) {
        // This shouldn't happen if the invite function worked correctly
        console.error("Missing inviter or supplier company ID in user metadata!");
        toast.error("Registration complete, but failed to link companies. Please contact support.");
      } else {
        const { error: relationshipError } = await supabase
          .from('company_relationships')
          .insert({
            customer_id: customerCompanyId,
            supplier_id: supplierCompanyId,
            status: 'active', // Set status to active upon registration completion
            type: 'supplier' // Assuming the invited user is always a supplier in this flow
          });

        if (relationshipError) {
          // Log the detailed error object from Supabase
          console.error("Failed to create company relationship:", JSON.stringify(relationshipError, null, 2));
          toast.error("Registration complete, but failed to link companies. Please contact support.");
        } else {
          toast.success("Registration complete! Companies linked. Redirecting to company setup...");
        }
      }

      // Redirect to onboarding page after successful registration
      // A small delay allows the user to see the success toast
      setTimeout(() => navigate('/onboarding', { replace: true }), 1500);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      toast.error(err.message || "Registration failed.");
      setLoading(false);
    }
    // setLoading(false); // Already handled in navigate timeout or error catch
  };

  if (loading && !isVerified) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /> Verifying invitation...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-600">{error}</div>;
  }

  if (!isVerified && !loading) {
     // Don't show form if verification hasn't passed and not loading
     return <div className="flex justify-center items-center h-screen text-muted-foreground">Waiting for verification...</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-semibold">1</div>
                <div className="h-1 w-12 bg-brand"></div>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand bg-white text-brand flex items-center justify-center font-semibold">2</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Step 1 of 2</div>
          </div>
          <CardTitle>Complete Your Registration</CardTitle>
          <CardDescription>
            Set your password and profile details for {email || 'your account'}. 
            After this, you'll be able to set up your company profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email (Read Only) */}
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email || ''} readOnly disabled className="bg-gray-100" />
            </div>

            {/* First Name */}
            <div className="space-y-1">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...form.register("firstName")} placeholder="Enter your first name" />
              {form.formState.errors.firstName && <p className="text-sm text-red-600">{form.formState.errors.firstName.message}</p>}
            </div>

            {/* Last Name */}
            <div className="space-y-1">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...form.register("lastName")} placeholder="Enter your last name" />
              {form.formState.errors.lastName && <p className="text-sm text-red-600">{form.formState.errors.lastName.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register("password")} placeholder="Enter your password" />
              {form.formState.errors.password && <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} placeholder="Confirm your password" />
              {form.formState.errors.confirmPassword && <p className="text-sm text-red-600">{form.formState.errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Registration
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteRegistration;