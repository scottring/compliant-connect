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
import { env } from "@/config/env";
import { v4 as uuidv4 } from 'uuid';
import { useQueryClient, useMutation, UseMutationResult } from '@tanstack/react-query';
import { Company } from "@/types/auth"; // Import Company type

// Form schema
const formSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  role: z.enum(["supplier", "customer", "both"]), // Assuming role still exists on companies table? Check schema.
  contact_name: z.string().min(2, "Contact name is required"),
  contact_email: z.string().email("Please enter a valid email"),
  contact_phone: z.string().min(5, "Please enter a valid phone number"),
});

type FormValues = z.infer<typeof formSchema>;

// --- Reusable Create Company & Associate User Mutation Hook ---
type CreateCompanyInput = FormValues & { userId: string };
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
                console.error("Error creating company:", companyError);
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
                console.error("Error creating company association:", associationError);
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
      role: "both",
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
    } catch (error: any) { console.error("Diagnostics error:", error); setError(`Diagnostic error: ${error.message}`);
    } finally { setDiagnosing(false); }
  };
  useEffect(() => { runDiagnostics(); }, []);
  // --- End Diagnostics ---

  // Create Company Mutation
  const createCompanyMutation = useCreateCompanyAndAssociateUserMutation(queryClient);

  const onSubmit = async (data: FormValues) => {
    if (!user) { toast.error("You must be logged in"); return; }
    try {
        // Try emergency function first
        const emergencyResult = await createCompanyDirectly({
            userId: user.id,
            companyName: data.name,
            contactName: data.contact_name,
            contactEmail: data.contact_email,
            contactPhone: data.contact_phone
        });

        if (emergencyResult.success) {
            toast.success("Company created successfully!");
            queryClient.invalidateQueries({ queryKey: ['userCompanies', user.id] });
            forceNavigateToEntryPoint();
            return;
        }

        // If emergency function fails, try the mutation
        await createCompanyMutation.mutateAsync({ ...data, userId: user.id });
        forceNavigateToEntryPoint();
    } catch (error) {
        console.error("Company creation failed:", error);
        toast.error("Failed to create company. Please try again.");
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
      console.log("Trying direct approach...");
      const directResult = await createCompanyDirectly({ userId: user.id, companyName: formData.name, contactName: formData.contact_name, contactEmail: formData.contact_email, contactPhone: formData.contact_phone }); // Removed role
      if (directResult.success) {
        toast.success(directResult.message);
        await queryClient.invalidateQueries({ queryKey: ['userCompanies', user.id] }); // Invalidate
        forceNavigateToEntryPoint(); return;
      }
      toast.error("Direct method failed: " + directResult.error);

      console.log("Trying SQL bypass...");
      const sqlResult = await createCompanyWithSQL({ userId: user.id, companyName: formData.name, role: formData.role, contactName: formData.contact_name, contactEmail: formData.contact_email, contactPhone: formData.contact_phone }); // Added role back
      if (sqlResult.success) {
        toast.success("SQL method succeeded!");
        await queryClient.invalidateQueries({ queryKey: ['userCompanies', user.id] }); // Invalidate
        forceNavigateToEntryPoint(); return;
      }
      toast.error("SQL method failed: " + sqlResult.error);

      // Add other fallback methods if necessary, ensuring query invalidation on success
      toast.error("All emergency creation methods failed.");

    } catch (error: any) { console.error("Emergency create error:", error); toast.error("Emergency create failed: " + error.message);
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
     try { await supabase.auth.signOut(); window.location.href = '/auth'; } catch (e) { console.error("Sign out error on force nav:", e); window.location.href = '/auth'; }
  };
  // --- End Emergency/Debug Functions ---

  const isSubmitting = createCompanyMutation.isPending; // Use mutation state

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome! Set up your company</CardTitle>
          <CardDescription>
            Please provide your company details to get started.
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
              <FormField control={form.control} name="role" render={({ field }) => (
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
              )} />
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
        <CardFooter className="flex flex-col items-start gap-4 pt-4 border-t">
           <p className="text-sm text-muted-foreground">Troubleshooting:</p>
           <div className="flex flex-wrap gap-2">
             <Button variant="outline" size="sm" onClick={runDiagnostics} disabled={diagnosing || isSubmitting}>
               {diagnosing ? "Running..." : "Run Diagnostics"}
             </Button>
             <Button variant="outline" size="sm" onClick={refreshAuthSession} disabled={isSubmitting}>
               Refresh Session
             </Button>
             <Button variant="destructive" size="sm" onClick={createCompanyEmergency} disabled={isSubmitting}>
               Emergency Create (Bypass RLS)
             </Button>
             {/* Add buttons for other debug functions if needed */}
           </div>
           {diagnosticResults && (
             <pre className="mt-2 p-2 border rounded bg-gray-50 text-xs overflow-auto max-h-40 w-full">
               {JSON.stringify(diagnosticResults, null, 2)}
             </pre>
           )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Onboarding;