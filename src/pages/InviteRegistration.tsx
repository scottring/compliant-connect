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
  const [isVerified, setIsVerified] = useState(false);
  // State to store relevant IDs from metadata
  const [invitationMetadata, setInvitationMetadata] = useState<{ customerCompanyId: string | null, supplierCompanyId: string | null }>({ customerCompanyId: null, supplierCompanyId: null });

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
        // console.log("Session found, user likely verified invite.", session.user.email); // Removed log
        setEmail(session.user.email || null);
        // Extract metadata needed for relationship
        const meta = session.user.user_metadata;
        // console.log("Extracted user metadata:", meta); // Removed log
        setInvitationMetadata({
            customerCompanyId: meta?.invited_to_company_id || null,
            supplierCompanyId: meta?.invited_supplier_company_id || null
        });
        if (!meta?.invited_to_company_id || !meta?.invited_supplier_company_id) {
            console.warn("Invitation metadata (customer or supplier company ID) missing from session user metadata.");
            // Optionally set an error or prevent form submission if IDs are crucial
            // setError("Could not retrieve necessary invitation details. Please contact support.");
            // setIsVerified(false); // Prevent submission if IDs are missing
        }
        setIsVerified(true);
      } else {
        // Priority 2: No session, check for tokens in hash (Password Recovery flow)
        // Note: Recovery flow might not have the same metadata. This needs careful handling
        // if suppliers can also reset passwords via this route. Assuming invite flow for now.
        const hash = location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type'); // Should be 'recovery'

        if (accessToken && refreshToken && type === 'recovery') {
          // console.log("Tokens found in hash, attempting recovery flow session set."); // Removed log
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError || !sessionData.session || !sessionData.user) {
            console.error("Error setting session from URL hash:", sessionError);
            setError("Failed to verify link parameters. Link might be expired or invalid.");
          } else {
            // console.log("Session set successfully from hash tokens.", sessionData.user.email); // Removed log
            setEmail(sessionData.user.email || null);
            // Extract metadata needed for relationship from recovery user data if applicable
            const meta = sessionData.user.user_metadata;
            // console.log("Extracted user metadata from recovery:", meta); // Removed log
             setInvitationMetadata({
                 customerCompanyId: meta?.invited_to_company_id || null,
                 supplierCompanyId: meta?.invited_supplier_company_id || null
             });
            if (!meta?.invited_to_company_id || !meta?.invited_supplier_company_id) {
                 console.warn("Invitation metadata (customer or supplier company ID) missing from recovery user metadata.");
                 // Optionally set an error or prevent form submission if IDs are crucial
            }
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

    // console.log("Registration onSubmit started. Metadata:", invitationMetadata); // Removed log

    try {
      // 1. Update the user's password (this confirms the invite)
      // console.log("Step 1: Updating user password..."); // Removed log
      const { error: passwordError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (passwordError) {
        console.error("Step 1 FAILED: Password update error:", passwordError);
        throw new Error(`Failed to set password: ${passwordError.message}`);
      }
      // console.log("Step 1 SUCCESS: Password updated."); // Removed log

      // 2. Update the user's profile with first/last name
      // Get the user ID from the current session (should exist after updateUser)
      // console.log("Step 2: Fetching user after password update..."); // Removed log
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          console.error("Step 2 FAILED: Could not get user after password update.");
          throw new Error("Could not retrieve user information after password update.");
      }
      // console.log(`Step 2 SUCCESS: Got user ID: ${user.id}`); // Removed log

      // console.log("Step 2b: Updating profile..."); // Removed log
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
        console.error("Step 2b WARNING: Password set, but failed to update profile:", profileError);
        // Don't toast success here, wait until the end
      } else {
        // console.log("Step 2b SUCCESS: Profile updated."); // Removed log
      }

      // --- START MODIFIED SECTION ---

      // 3. Link the user to their company in company_users
      // console.log("Step 3: Attempting to link user to company..."); // Removed log
      let companyUserLinkSuccess = false; // Flag to track success
      const supplierCompanyId = invitationMetadata.supplierCompanyId; // Cache for logging
      if (supplierCompanyId && user) { // Ensure we have the supplier company ID and user object
        // console.log(`Step 3: Inserting into company_users: user_id=${user.id}, company_id=${supplierCompanyId}`); // Removed log
        const { error: companyUserError } = await supabase
          .from('company_users')
          .insert({
            user_id: user.id,
            company_id: supplierCompanyId,
            role: 'admin' // Assign a default role (e.g., 'admin' or 'member')
          });

        if (companyUserError) {
          // Log error, but registration is mostly complete. Might need manual fix.
          console.error("Step 3 FAILED: Failed to link user to their company:", companyUserError);
          toast.error("Registration complete, but failed to associate user with their company. Please contact support.");
          // Don't throw here, allow relationship attempt if possible, but mark as failed
        } else {
          // console.log(`Step 3 SUCCESS: User ${user.id} successfully linked to company ${supplierCompanyId}`); // Removed log
          companyUserLinkSuccess = true; // Mark as successful
        }
      } else if (!supplierCompanyId) {
          console.warn("Step 3 SKIPPED: Skipping user-company link creation due to missing supplier company ID in metadata.");
          toast.warning("Registration complete, but could not link user to their company due to missing details.");
          // Don't throw, but linking failed
      } else if (!user) {
          // This case should be caught earlier, but log just in case
          console.error("Step 3 SKIPPED: User object is missing.");
      }

      // 4. Activate the existing company relationship (Update status from 'pending' to 'active')
      // console.log("Step 4: Attempting to activate company relationship..."); // Removed log
      let relationshipSuccess = false; // Flag to track success
      const customerCompanyId = invitationMetadata.customerCompanyId; // Cache for logging
      if (customerCompanyId && supplierCompanyId) {
        // console.log(`Step 4: Updating company_relationships: set status='active' WHERE customer_id=${customerCompanyId} AND supplier_id=${supplierCompanyId}`); // Removed log
        const { error: relationshipError } = await supabase
          .from('company_relationships')
          .update({ status: 'active' }) // Update status to active
          .eq('customer_id', customerCompanyId) // Match the existing relationship
          .eq('supplier_id', supplierCompanyId); // Match the existing relationship

        if (relationshipError) {
          // Log relationship error but registration is mostly complete
          console.error("Step 4 FAILED: Failed to activate company relationship:", relationshipError);
          toast.error("Registration complete, but failed to activate link to inviting company. Please contact support.");
          // Don't throw here
        } else {
          // Check if the update actually affected any rows.
          // Note: Supabase update doesn't directly return affected rows count easily in v2 JS client.
          // We assume success if no error is thrown, but ideally, we'd verify the update.
          // console.log(`Step 4 SUCCESS: Attempted to activate relationship between ${customerCompanyId} and ${supplierCompanyId}. Check DB to confirm.`); // Removed log
          relationshipSuccess = true; // Mark as successful if no error
        }
      } else {
          console.warn("Step 4 SKIPPED: Skipping company relationship activation due to missing metadata IDs.");
          toast.warning("Registration complete, but could not activate link to inviting company due to missing details.");
          // Don't throw, but relationship activation failed
      }

      // --- END MODIFIED SECTION ---

      // Final success message only if core steps succeeded
      // console.log(`Final Check: companyUserLinkSuccess=${companyUserLinkSuccess}, relationshipSuccess=${relationshipSuccess}`); // Removed log
      if (companyUserLinkSuccess && relationshipSuccess) {
          toast.success("Registration complete and linked successfully! Redirecting...");
      } else {
          // Use a more generic message if some steps failed but didn't throw
          toast.warning("Registration complete, but some linking steps encountered issues. Please check logs or contact support.");
      }


      // Redirect to dashboard or appropriate page after successful registration
      // A small delay allows the user to see the success toast
      // console.log("Redirecting to dashboard..."); // Removed log
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);

    } catch (err: any) {
      console.error("Registration onSubmit CATCH block error:", err); // Log caught errors
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
          <CardTitle>Complete Your Registration</CardTitle>
          <CardDescription>Set your password and profile details for {email || 'your account'}.</CardDescription>
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
