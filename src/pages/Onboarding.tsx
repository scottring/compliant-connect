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
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { env } from "@/config/env";
import { v4 as uuidv4 } from 'uuid';

// Form schema
const formSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  role: z.enum(["supplier", "customer", "both"]),
  contact_name: z.string().min(2, "Contact name is required"),
  contact_email: z.string().email("Please enter a valid email"),
  contact_phone: z.string().min(5, "Please enter a valid phone number"),
});

type FormValues = z.infer<typeof formSchema>;

const Onboarding = () => {
  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      role: "both",
      contact_name: user?.profile?.first_name && user?.profile?.last_name
        ? `${user.profile.first_name} ${user.profile.last_name}`
        : "",
      contact_email: user?.email || "",
      contact_phone: "",
    },
  });

  // Run diagnostics if needed
  const runDiagnostics = async () => {
    setDiagnosing(true);
    setError(null);
    try {
      const results = await diagnoseRlsIssues();
      setDiagnosticResults(results);
      
      // Check for common issues
      if (!results.hasSession) {
        setError("No active session found. Please try signing out and back in.");
      } else if (!results.canSelectCompanies) {
        setError("Unable to access companies table. The database might not be set up correctly.");
      } else if (!results.canSelectUsers) {
        setError("Unable to access company_users table. The database might not be set up correctly.");
      }
    } catch (error: any) {
      console.error("Error running diagnostics:", error);
      setError(`Diagnostic error: ${error.message}`);
    } finally {
      setDiagnosing(false);
    }
  };

  useEffect(() => {
    // Auto-run diagnostics once on load
    runDiagnostics();
  }, []);

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast.error("You must be logged in to create a company");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("Creating company with data:", data);
      
      // Debug current user
      console.log("Current authenticated user:", {
        id: user.id,
        email: user.email,
        role: user.role,
        hasSession: !!supabase.auth.getSession
      });
      
      // Debug RLS by checking if we can select from companies table
      try {
        const { data: testSelect, error: testSelectError } = await supabase
          .from("companies")
          .select("id")
          .limit(1);
          
        console.log("Test SELECT from companies:", { 
          success: !testSelectError, 
          count: testSelect?.length || 0,
          error: testSelectError
        });
      } catch (selectError) {
        console.error("Error during test SELECT:", selectError);
      }
      
      // Insert new company with detailed error tracking
      let companyResult;
      try {
        companyResult = await supabase
          .from("companies")
          .insert({
            name: data.name,
            role: data.role,
            contact_name: data.contact_name,
            contact_email: data.contact_email,
            contact_phone: data.contact_phone,
            progress: 0,
          })
          .select()
          .single();
        
        console.log("Company insert result:", companyResult);
        
        if (companyResult.error) {
          console.error("Error creating company:", companyResult.error);
          
          // Check specifically for RLS errors
          if (companyResult.error.code === '42501' || companyResult.error.message?.includes('permission denied')) {
            toast.error("Permission denied: There's an issue with database permissions. Please try again or contact support.");
            return;
          }
          
          throw companyResult.error;
        }
      } catch (companyInsertError) {
        console.error("Exception during company insert:", companyInsertError);
        throw companyInsertError;
      }

      const company = companyResult.data;
      console.log("Company created successfully:", company);

      // Associate user with the company
      let associationResult;
      try {
        associationResult = await supabase
          .from("company_users")
          .insert({
            user_id: user.id,
            company_id: company.id,
            role: "owner", // First user is the owner
          });
        
        console.log("Association insert result:", associationResult);
        
        if (associationResult.error) {
          console.error("Error creating company association:", associationResult.error);
          
          // Check specifically for RLS errors
          if (associationResult.error.code === '42501' || associationResult.error.message?.includes('permission denied')) {
            toast.error("Permission denied: There's an issue with database permissions. Please try again or contact support.");
            
            // Try to delete the company we just created since the association failed
            const { error: deleteError } = await supabase
              .from("companies")
              .delete()
              .eq("id", company.id);
            
            if (deleteError) {
              console.error("Failed to delete orphaned company:", deleteError);
            }
            
            return;
          }
          
          throw associationResult.error;
        }
      } catch (associationInsertError) {
        console.error("Exception during association insert:", associationInsertError);
        throw associationInsertError;
      }

      console.log("Company association created successfully");

      // Refresh user data to get the new company
      await refreshUserData();
      
      toast.success("Company created successfully!");
      
      // Use the force navigation function
      forceNavigateToEntryPoint();
    } catch (error: any) {
      console.error("Error creating company:", error);
      
      // Show more specific error message if available
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        toast.error("Permission issue: Unable to create company due to database permissions. Please try logging out and back in.");
      } else if (error.code === '23505' || error.message?.includes('duplicate key')) {
        toast.error("A company with this name already exists.");
      } else {
        toast.error(error.message || "Failed to create company. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Emergency bypass function to create company directly
  const createCompanyEmergency = async () => {
    // Make sure we have a valid user ID
    if (!user?.id) {
      toast.error("You must be logged in to create a company");
      console.error("No user ID available:", user);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Get form values
      const formData = form.getValues();
      
      if (!formData.name || !formData.contact_name || !formData.contact_email || !formData.contact_phone) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Log user ID to make sure it's available
      console.log("Creating company with user ID:", user.id);
      
      // First try the direct approach
      console.log("Trying direct approach first...");
      const directResult = await createCompanyDirectly({
        userId: user.id,
        companyName: formData.name,
        role: formData.role,
        contactName: formData.contact_name,
        contactEmail: formData.contact_email,
        contactPhone: formData.contact_phone
      });
      
      if (directResult.success) {
        toast.success(directResult.message);
        console.log("Direct company creation succeeded:", directResult);
        
        // Refresh user data
        await refreshUserData();
        
        // Use the force navigation function
        forceNavigateToEntryPoint();
        return;
      }
      
      console.log("Direct approach failed:", directResult.error);
      toast.error("Direct method failed: " + directResult.error);
      
      // Next try the SQL approach
      console.log("Trying SQL bypass method...");
      const sqlResult = await createCompanyWithSQL({
        userId: user.id,
        companyName: formData.name,
        role: formData.role,
        contactName: formData.contact_name,
        contactEmail: formData.contact_email,
        contactPhone: formData.contact_phone
      });
      
      if (sqlResult.success) {
        toast.success("Company created successfully using SQL method!");
        console.log("SQL company creation result:", sqlResult);
        
        // Refresh user data
        await refreshUserData();
        
        // Use the force navigation function
        forceNavigateToEntryPoint();
        return;
      }
      
      console.log("SQL approach failed:", sqlResult.error);
      toast.error("SQL method failed: " + sqlResult.error);
      
      // Final fallback with UUID approach
      console.log("Trying standard API approach with UUIDs as last resort...");
      const companyId = uuidv4();
      const companyUserId = uuidv4();
      const now = new Date().toISOString();

      // First insert the company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{
          id: companyId,
          name: formData.name,
          role: formData.role,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          progress: 0,
          created_at: now,
          updated_at: now
        }])
        .select();
        
      if (companyError) {
        console.error("Company insertion error:", companyError);
        toast.error("Final fallback failed: " + companyError.message);
        return;
      }
      
      // Then create the user association
      const { data: userData, error: userError } = await supabase
        .from('company_users')
        .insert([{
          id: companyUserId,
          company_id: companyId,
          user_id: user.id,
          role: 'owner',
          created_at: now,
          updated_at: now
        }])
        .select();
        
      if (userError) {
        console.error("User association error:", userError);
        toast.error("User association failed: " + userError.message);
        
        // Try to clean up the company
        await supabase.from('companies').delete().eq('id', companyId);
        return;
      }
      
      // Log the results
      console.log("Final fallback succeeded:", { companyData, userData });
      toast.success("Company created successfully using standard API method!");
      
      // Refresh user data
      await refreshUserData();
      
      // Use the force navigation function
      forceNavigateToEntryPoint();
    } catch (error: any) {
      console.error("ALL emergency company creation methods failed:", error);
      toast.error("All creation methods failed: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresh auth session without logout
  const refreshAuthSession = async () => {
    try {
      setIsSubmitting(true);
      console.log("Refreshing auth session...");
      
      // Attempt to refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        toast.error("Failed to refresh session: " + error.message);
        console.error("Session refresh error:", error);
      } else {
        toast.success("Session refreshed successfully");
        console.log("Session refreshed:", data.session?.user?.email);
        
        // Refresh the user data
        await refreshUserData();
        
        // Re-run diagnostics
        await runDiagnostics();
      }
    } catch (error: any) {
      console.error("Error refreshing session:", error);
      toast.error("Error refreshing session: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a new function to handle fixing RLS policies
  const fixRlsPolicies = async () => {
    try {
      setIsSubmitting(true);
      console.log("Attempting to fix RLS policies...");
      
      const result = await checkAndFixRlsPolicies();
      
      if (result.success) {
        toast.success("RLS policies updated successfully!");
        
        // Re-run diagnostics
        await runDiagnostics();
      } else {
        toast.error(`Failed to fix policies: ${result.error}`);
        console.error("Policy fix error:", result.error);
      }
    } catch (error: any) {
      console.error("Error fixing RLS policies:", error);
      toast.error(`Error fixing policies: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a function to handle checking and creating tables
  const checkAndCreateTablesHandler = async () => {
    try {
      setIsSubmitting(true);
      console.log("Checking and creating tables if needed...");
      
      const result = await checkAndCreateTables();
      
      if (result.success) {
        if (result.needsCreation) {
          toast.success("Database tables created successfully!");
        } else {
          toast.success("Database tables already exist!");
        }
        
        // Re-run diagnostics
        await runDiagnostics();
      } else {
        toast.error(`Failed to check/create tables: ${result.error}`);
        console.error("Table check/create error:", result.error);
      }
    } catch (error: any) {
      console.error("Error checking/creating tables:", error);
      toast.error(`Error checking/creating tables: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add a function to handle the new table creation method
  const createTablesWithAPI = async () => {
    try {
      setIsSubmitting(true);
      console.log("Testing tables with Supabase API...");
      
      const result = await createTablesWithSupabaseAPI();
      
      if (result.success) {
        toast.success(result.message);
        
        // Re-run diagnostics
        await runDiagnostics();
      } else {
        toast.error(`Table test failed: ${result.error}`);
        console.error("API table test failed:", result.error, result.details);
      }
    } catch (error: any) {
      console.error("Error testing tables with API:", error);
      toast.error(`Error testing tables: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create a bypass navigation function that completely avoids React Router
  const forceNavigateToEntryPoint = async () => {
    try {
      console.log("Starting navigation process");
      
      // Force a complete logout and redirect to auth page
      // This is a drastic solution but will completely reset the auth state
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
      }
      
      // Brief delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Force navigation to auth page
      console.log("Redirecting to auth page to force a clean state");
      window.location.href = "/auth";
      
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback to direct navigation
      window.location.href = "/auth";
    }
  };

  // Update the createCompanyDirect function
  const createCompanyDirect = async () => {
    try {
      setIsSubmitting(true);
      console.log("Creating company with direct database bypass approach");
      
      // Get form values and validate
      const formData = form.getValues();
      const errors = await form.trigger();
      
      if (!errors || !user?.id) {
        toast.error("Please fill in all required fields and make sure you're logged in");
        return;
      }
      
      // Generate UUIDs
      const companyId = uuidv4();
      const companyUserId = uuidv4();
      const now = new Date().toISOString();
            
      // Show the user ID for debugging
      console.log(`Creating company for user: ${user.id} (${user.email})`);
      
      // 1. First create the company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          id: companyId,
          name: formData.name,
          role: formData.role,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          progress: 0,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
      
      if (companyError) {
        console.error("Error creating company:", companyError);
        toast.error(`Company creation failed: ${companyError.message}`);
        return;
      }
      
      console.log("Company created:", company);
      
      // 2. Create company-user association
      console.log(`Creating association between company ${companyId} and user ${user.id}`);
      
      const { data: association, error: associationError } = await supabase
        .from('company_users')
        .insert({
          id: companyUserId,
          company_id: companyId,
          user_id: user.id, // This should not be null
          role: 'owner',
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
      
      if (associationError) {
        console.error("Error creating company association:", associationError);
        toast.error(`Association failed: ${associationError.message}`);
        
        // Try to clean up the company
        await supabase.from('companies').delete().eq('id', companyId);
        return;
      }
      
      console.log("Company association created:", association);
      toast.success("Company created successfully!");
      
      // Add debug information about the navigation
      console.log("About to navigate to dashboard page");
      console.log("Current location:", window.location.href);
      
      // Use the force navigation function
      forceNavigateToEntryPoint();
    } catch (error: any) {
      console.error("Direct company creation error:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-lg mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create Your Company</CardTitle>
          <CardDescription>
            Set up your company profile to get started with StacksData
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between flex-wrap">
          <div className="flex flex-wrap gap-2 mb-2">
            {/* Always show diagnostic tools */}
            <>
              <Button 
                variant="outline" 
                onClick={runDiagnostics}
                disabled={diagnosing || isSubmitting}
              >
                {diagnosing ? "Checking..." : "Diagnose"}
              </Button>
              <Button 
                variant="outline" 
                onClick={refreshAuthSession}
                disabled={isSubmitting}
              >
                Refresh Session
              </Button>
              <Button 
                variant="outline" 
                onClick={resetAuthSession}
                disabled={isSubmitting}
              >
                Logout & Reset
              </Button>
              <Button 
                variant="outline"
                onClick={fixRlsPolicies}
                disabled={isSubmitting}
              >
                Fix RLS Policies
              </Button>
              <Button 
                variant="outline"
                onClick={checkAndCreateTablesHandler}
                disabled={isSubmitting}
              >
                Create Tables
              </Button>
              <Button 
                variant="outline"
                onClick={createTablesWithAPI}
                disabled={isSubmitting}
              >
                Test Tables API
              </Button>
              <Button 
                variant="outline"
                onClick={createCompanyDirect}
                disabled={isSubmitting}
              >
                Direct Create
              </Button>
              <Button 
                variant="destructive" 
                onClick={createCompanyEmergency}
                disabled={isSubmitting}
              >
                Emergency Create
              </Button>
            </>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={createCompanyDirect}
              disabled={isSubmitting}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Creating..." : "Create Company (Direct)"}
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Company"}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Debug panel - always visible */}
      {diagnosticResults && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Diagnostic Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-50 p-4 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(diagnosticResults, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Onboarding; 