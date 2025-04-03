import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const InvitationConfirm = () => {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth loading to finish and session to be potentially established
    if (authLoading) {
      setStatus('loading');
      return;
    }

    // If no session/user after loading, something went wrong with the token
    if (!session || !user) {
      setStatus('error');
      setErrorMessage('Invalid or expired invitation link. Please request a new invitation.');
      // Optional: Redirect to login after a delay?
      // setTimeout(() => navigate('/auth'), 5000);
      return;
    }

    // Start processing if we have a user and haven't processed yet
    if (status === 'loading' && user) {
      setStatus('processing');
      handleInvitationAcceptance();
    }

  }, [authLoading, session, user, status]); // Rerun when auth state changes or status changes

  const handleInvitationAcceptance = async () => {
    if (!user?.user_metadata) {
       setStatus('error');
       setErrorMessage('Missing invitation details. Cannot complete setup.');
       return;
    }

    const {
        invited_by_user_id, // ID of the user who invited
        invited_to_company_id, // ID of the *customer* company that invited
        invited_supplier_name, // Name of the supplier company (provided in invite modal)
        invited_contact_name, // Name of the contact person (provided in invite modal)
        invited_supplier_company_id // ID of the supplier company (now passed from invite)
    } = user.user_metadata;

    console.log('Handling invitation acceptance for user:', user.id, 'Metadata:', user.user_metadata);

    // Basic validation of metadata
    // Validate required metadata including the new supplier company ID
    if (!invited_to_company_id || !invited_supplier_company_id) {
        setStatus('error');
        setErrorMessage('Invitation metadata is incomplete. Cannot link companies.');
        return;
    }

    try {
      // --- Database Operations ---

      // 1. Find or Create the Supplier Company
      // We already create the company record when sending the invite now.
      // Let's find the relationship record instead, which should be 'pending'.
      console.log(`Searching for pending relationship for supplier: ${invited_supplier_name} invited by customer: ${invited_to_company_id}`);

      const { data: relationshipData, error: relationshipError } = await supabase
        .from('company_relationships')
        .select('id, supplier_id, status')
        .eq('customer_id', invited_to_company_id)
        .eq('supplier_id', invited_supplier_company_id) // Use the ID from metadata
        .eq('status', 'pending') // Look for the pending relationship
        .limit(1)
        .maybeSingle(); // Use maybeSingle as there might not be one if something went wrong

        // TODO: Refine supplier company identification. Querying by name is fragile.
        // Ideally, the invite metadata should contain the exact supplier_company_id created earlier.

      if (relationshipError) throw new Error(`Error finding company relationship: ${relationshipError.message}`);
      if (!relationshipData) throw new Error(`Could not find pending relationship for supplier "${invited_supplier_name}". Setup cannot proceed.`);

      const supplierCompanyId = relationshipData.supplier_id;
      const relationshipId = relationshipData.id;

      console.log(`Found pending relationship: ${relationshipId} for supplier company: ${supplierCompanyId}`);

      // 2. Link the newly confirmed user to their Supplier Company
      console.log(`Linking user ${user.id} to supplier company ${supplierCompanyId}`);
      const { error: userLinkError } = await supabase
        .from('company_users')
        .insert({
          user_id: user.id,
          company_id: supplierCompanyId,
          role: 'member', // Assign a default role, e.g., 'member'
        });

      // Handle potential duplicate link error gracefully (user might already be linked)
      if (userLinkError && userLinkError.code !== '23505') { // 23505 is unique_violation
        throw new Error(`Failed to link user to company: ${userLinkError.message}`);
      } else if (userLinkError && userLinkError.code === '23505') {
        console.warn(`User ${user.id} already linked to company ${supplierCompanyId}. Proceeding.`);
      }

      // 3. Update the Company Relationship status to 'active'
      console.log(`Updating relationship ${relationshipId} to active`);
      const { error: updateRelError } = await supabase
        .from('company_relationships')
        .update({ status: 'active' })
        .eq('id', relationshipId);

      if (updateRelError) throw new Error(`Failed to activate company relationship: ${updateRelError.message}`);

      // --- Success ---
      setStatus('success');
      toast.success('Account confirmed and linked successfully!');

      // Redirect to dashboard after a short delay
      setTimeout(() => navigate('/dashboard'), 2000);

    } catch (error: any) {
      console.error('Error handling invitation acceptance:', error);
      setStatus('error');
      setErrorMessage(error.message || 'An unexpected error occurred during setup.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center p-4">
      {status === 'loading' && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-brand mb-4" />
          <p className="text-lg text-gray-700">Verifying invitation...</p>
        </>
      )}
      {status === 'processing' && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-brand mb-4" />
          <p className="text-lg text-gray-700">Setting up your account and company links...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <h1 className="text-3xl font-bold text-green-600 mb-4">Success!</h1>
          <p className="text-lg text-gray-700 mb-6">
            Your account is confirmed and linked. Redirecting you shortly...
          </p>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="text-3xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-lg text-gray-700 mb-6">
            {errorMessage || 'Could not complete account setup.'}
          </p>
          {/* Optionally add a button to retry or contact support */}
        </>
      )}
    </div>
  );
};

export default InvitationConfirm;