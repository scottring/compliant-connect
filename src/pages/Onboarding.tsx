import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { diagnoseRlsIssues, resetAuthSession, createCompanyWithSQL, checkAndFixRlsPolicies, checkAndCreateTables, createTablesWithSupabaseAPI, createCompanyDirectly } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Removed unused import: import { env } from "@/config/env";
import { v4 as uuidv4 } from 'uuid';
import { useQueryClient, useMutation, UseMutationResult } from '@tanstack/react-query';
import { Company } from "@/types/auth"; // Import Company type
import { Database } from "@/integrations/supabase/types"; // Import base Database type

// Form schema
const formSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  // role: z.enum(["supplier", "customer", "both"]), // Role might be determined by flow now
  contact_name: z.string().min(2, "Contact name is required"),
  contact_email: z.string().email("Please enter a valid email"),
  contact_phone: z.string().min(5, "Please enter a valid phone number"),
});

type FormValues = z.infer<typeof formSchema>;

// --- Reusable Create Company & Associate User Mutation Hook ---
type CreateCompanyInput = FormValues & { userId: string };
// Input type for updating an invited company
type UpdateInvitedCompanyInput = FormValues & {
    userId: string;
    supplierCompanyId: string; // ID of the company record to update
    customerCompanyId: string; // ID of the company that invited this supplier
};
// Result type for update mutation
type UpdateInvitedCompanyResult = { company: Company };

// --- Create Company Mutation Hook ---
type CreateCompanyResult = { company: Company }; // Example result

const useCreateCompanyAndAssociateUserMutation = (
    queryClient: ReturnType<typeof useQueryClient>
): UseMutationResult<CreateCompanyResult, Error, CreateCompanyInput> => {
    return useMutation<CreateCompanyResult, Error, CreateCompanyInput>({
        mutationFn: async (input) => {
            const { userId, ...companyData } = input;

            // Insert new company
            const { data: company, error: companyError } = await supabase
                .from("companies")
                .insert({
                    name: companyData.name,
                    // role: companyData.role, // Include if schema has it
                    contact_name: companyData.contact_name,
                    contact_email: companyData.contact_email,
                    contact_phone: companyData.contact_phone,
                    // progress: 0, // Removed - Column does not exist in schema
                })
                .select()
                .single();

            if (companyError) {
                if (companyError.code === '23505') throw new Error("A company with this name already exists.");
                if (companyError.code === '42501') throw new Error("Permission denied: Could not create company.");
                throw new Error(`Failed to create company: ${companyError.message}`);
            }
            if (!company) throw new Error("Company creation failed: No data returned.");

            // Associate user with the company
            const { error: associationError } = await supabase
                .from("company_users")
                .insert({
                    user_id: userId,
                    company_id: company.id,
                    role: "owner", // First user is the owner
                });

            if (associationError) {
                // await supabase.from("companies").delete().eq("id", company.id); // Temporarily disabled cleanup
                if (associationError.code === '42501') throw new Error("Permission denied: Could not associate user with company.");
                throw new Error(`Failed to associate user: ${associationError.message}`);
            }

            return { company: company as Company };
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['userCompanies', variables.userId] });
            toast.success("Company created successfully!");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create company. Please try again.");
        },
    });
};
// --- End Create Company Mutation Hook ---

// --- NEW: Update Invited Company & Link User Mutation Hook ---
const useUpdateInvitedCompanyMutation = (
    queryClient: ReturnType<typeof useQueryClient>
): UseMutationResult<UpdateInvitedCompanyResult, Error, UpdateInvitedCompanyInput> => {
    return useMutation<UpdateInvitedCompanyResult, Error, UpdateInvitedCompanyInput>({
        mutationFn: async (input) => {
            const { userId, supplierCompanyId, customerCompanyId, ...companyUpdateData } = input;

            // 1. Update the existing supplier company record
            const { data: updatedCompany, error: companyUpdateError } = await supabase
                .from("companies")
                .update({
                    name: companyUpdateData.name, // Update name if needed
                    contact_name: companyUpdateData.contact_name,
                    contact_email: companyUpdateData.contact_email,
                    contact_phone: companyUpdateData.contact_phone,
                    // role: companyUpdateData.role, // Role might not be on companies table
                    updated_at: new Date().toISOString(),
                })
                .eq('id', supplierCompanyId)
                .select()
                .single();

            if (companyUpdateError) throw new Error(`Failed to update company details: ${companyUpdateError.message}`);
            if (!updatedCompany) throw new Error("Company update failed: No data returned.");

            // 2. Associate the user with this supplier company (e.g., as 'member')
            const { error: associationError } = await supabase
                .from("company_users")
                .insert({
                    user_id: userId,
                    company_id: supplierCompanyId,
                    role: "member", // Or appropriate role for invited supplier user
                });

            // Allow association errors if user might already be linked (e.g., re-onboarding)
            if (associationError && associationError.code !== '23505') { // Ignore unique violation errors
                 console.warn(`Failed to associate user (might already exist): ${associationError.message}`);
                 // Decide if this should be a hard error or just a warning
                 // throw new Error(`Failed to associate user: ${associationError.message}`);
            }

            // 3. Update the existing relationship status to 'active'
            const { error: relationshipError } = await supabase
                .from('company_relationships')
                .update({ status: 'active' }) // Update status
                .eq('customer_id', customerCompanyId) // Find the specific relationship
                .eq('supplier_id', supplierCompanyId);

            // Log error if update fails, but maybe don't throw if company/user steps succeeded
            if (relationshipError) {
                 console.error(`Failed to update company relationship status: ${relationshipError.message}`);
                 toast.warning("Company profile updated, but failed to activate relationship link.");
                 // throw new Error(`Failed to update company relationship status: ${relationshipError.message}`);
            }

            return { company: updatedCompany as Company };
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['userCompanies', variables.userId] });
            // Invalidate customer list for the inviting company if possible/needed
            // queryClient.invalidateQueries({ queryKey: ['suppliers', variables.customerCompanyId] });
            toast.success("Company profile updated and linked successfully!");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update company profile. Please try again.");
        },
    });
};
// --- End Update Invited Company Mutation Hook ---


const Onboarding = () => {
  const { user } = useAuth(); // Keep useAuth for user object
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // const [isSubmitting, setIsSubmitting] = useState(false); // Replaced by mutation state
  const [error, setError] = useState<string | null>(null); // Keep for diagnostic errors
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      // role: "both", // Remove role default
      // role: "both", // Removed role default
      contact_name: "", // Removed profile dependency
      contact_email: user?.email || "",
      contact_phone: "",
    },
  });

  // Update default email when user loads/changes
  useEffect(() => {
      if (user && user.email !== form.getValues("contact_email")) {
          form.reset({
              ...form.getValues(),
              contact_email: user.email || "",
          });
      }
  }, [user, form]);


  // --- Diagnostics --- (Keep as is for now)
  const runDiagnostics = async () => {
    setDiagnosing(true);
    setError(null);
    try {
      const results = await diagnoseRlsIssues();
      setDiagnosticResults(results);
      if (!results.hasSession) setError("No active session found.");
      else if (!results.canSelectCompanies) setError("Cannot access companies table.");
      else if (!results.canSelectUsers) setError("Cannot access company_users table.");
    } catch (error: any) { setError(`Diagnostic error: ${error.message}`);
    } finally { setDiagnosing(false); }
  };
  useEffect(() => { runDiagnostics(); }, []);
  // --- End Diagnostics ---

  // Create Company Mutation
  const createCompanyMutation = useCreateCompanyAndAssociateUserMutation(queryClient); // Restore the correct declaration
  // Update Invited Company Mutation
  const updateInvitedCompanyMutation = useUpdateInvitedCompanyMutation(queryClient);
  // const createCompanyMutation = useCreateCompanyAndAssociateUserMutation(queryClient); // Removed duplicate

  const onSubmit = async (data: FormValues) => {
    if (!user) { toast.error("You must be logged in"); return; }

    // Log the entire user object and specific metadata fields
    console.log("[DEBUG] Onboarding User Object:", JSON.stringify(user, null, 2));
    const invitedSupplierCompanyId = user.user_metadata?.invited_supplier_company_id; // Read from user_metadata
    const invitedByCompanyId = user.user_metadata?.invited_to_company_id; // Read from user_metadata
    console.log("[DEBUG] Onboarding Metadata - Supplier ID:", invitedSupplierCompanyId);
    console.log("[DEBUG] Onboarding Metadata - Customer ID:", invitedByCompanyId);

    try {
      if (invitedSupplierCompanyId && invitedByCompanyId) {
        // --- Invited Supplier Flow ---
        console.log("[DEBUG] Onboarding: Invited supplier flow detected.");
        await updateInvitedCompanyMutation.mutateAsync({
          ...data,
          userId: user.id,
          supplierCompanyId: invitedSupplierCompanyId,
          customerCompanyId: invitedByCompanyId,
        });
      } else {
        // --- New User/Company Flow ---
        console.log("[DEBUG] Onboarding: New company flow detected.");
        // Try emergency function first (Consider removing if main mutation is reliable)
        /* const emergencyResult = await createCompanyDirectly({
            userId: user.id,
            companyName: data.name,
            contactName: data.contact_name,
            contactEmail: data.contact_email,
            contactPhone: data.contact_phone
        }); */
        // Use the standard create mutation
        await createCompanyMutation.mutateAsync({ ...data, userId: user.id });
      }
      forceNavigateToEntryPoint(); // Navigate after success in either flow
    } catch (error: any) {
      // Error toast is handled within the mutation hooks, but log here too
      console.error("Onboarding submission failed:", error);
      // toast.error("Failed to complete onboarding. Please try again."); // Redundant?
    }
  };

  // --- Emergency/Debug Functions --- (Update refreshUserData calls)
  const createCompanyEmergency = async () => {
    if (!user?.id) { toast.error("You must be logged in"); return; }
    const formData = form.getValues();
    if (!formData.name || !formData.contact_name || !formData.contact_email || !formData.contact_phone) {
      toast.error("Please fill in all required fields"); return;
    }
    // setIsSubmitting(true); // Consider adding separate loading state for debug actions
    try {
      const directResult = await createCompanyDirectly({ userId: user.id, companyName: formData.name, contactName: formData.contact_name, contactEmail: formData.contact_email, contactPhone: formData.contact_phone }); // Removed role
      if (directResult.success) {
        toast.success(directResult.message);
        await queryClient.invalidateQueries({ queryKey: ['userCompanies', user.id] }); // Invalidate
        forceNavigateToEntryPoint(); return;
      }
      toast.error("Direct method failed: " + directResult.error);

      // const sqlResult = await createCompanyWithSQL({ userId: user.id, companyName: formData.name, /* role: formData.role, */ contactName: formData.contact_name, contactEmail: formData.contact_email, contactPhone: formData.contact_phone }); // Removed role
      // if (sqlResult.success) {
      //   toast.success("SQL method succeeded!");
      //   await queryClient.invalidateQueries({ queryKey: ['userCompanies', user.id] }); // Invalidate
      //   forceNavigateToEntryPoint(); return;
      // }
      // toast.error("SQL method failed: " + sqlResult.error); // Removed call to deprecated function

      // Add other fallback methods if necessary, ensuring query invalidation on success
      toast.error("All emergency creation methods failed.");

    } catch (error: any) { toast.error("Emergency create failed: " + error.message);
    } finally { /* setIsSubmitting(false); */ }
  };

  const refreshAuthSession = async () => {
    // setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) { toast.error("Session refresh failed: " + error.message); }
      else {
        toast.success("Session refreshed");
        await queryClient.invalidateQueries({ queryKey: ['userCompanies', user?.id] }); // Invalidate user-dependent queries
        await runDiagnostics();
      }
    } catch (error: any) { toast.error("Session refresh error: " + error.message);
    } finally { /* setIsSubmitting(false); */ }
  };

  const fixRlsPolicies = async () => { /* ... implementation ... */
     try { /* ... */ await runDiagnostics(); } catch (e) { /* ... */ } finally { /* ... */ }
  };
  const checkAndCreateTablesHandler = async () => { /* ... implementation ... */
     try { /* ... */ await runDiagnostics(); } catch (e) { /* ... */ } finally { /* ... */ }
  };
  const createTablesWithAPI = async () => { /* ... implementation ... */
     try { /* ... */ await runDiagnostics(); } catch (e) { /* ... */ } finally { /* ... */ }
  };
  const forceNavigateToEntryPoint = async () => { /* ... implementation ... */
     try { await supabase.auth.signOut(); window.location.href = '/auth'; } catch (e) { window.location.href = '/auth'; }
  };
  // --- End Emergency/Debug Functions ---

  const isSubmitting = createCompanyMutation.isPending; // Use mutation state

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold">✓</div>
                <div className="h-1 w-12 bg-brand"></div>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-semibold">2</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">Step 2 of 2</div>
          </div>
          <CardTitle>Set Up Your Company</CardTitle>
          <CardDescription>
            Complete your company profile to start using the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl><Input placeholder="Your Company Inc." {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {/* Role field might need removal if not in DB schema */}
              {/* Role field might need removal if not in DB schema */}
              {/* <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="customer">Customer (Requesting Info)</SelectItem>
                      <SelectItem value="supplier">Supplier (Providing Info)</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} /> */}
              <FormField control={form.control} name="contact_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl><Input placeholder="Primary contact" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contact_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl><Input type="email" placeholder="contact@yourcompany.com" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contact_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl><Input placeholder="Your phone number" {...field} disabled={isSubmitting} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating Company..." : "Create Company"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;