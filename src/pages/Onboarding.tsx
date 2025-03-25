import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// Form schema
const formSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  companyRole: z.enum(["supplier", "customer", "both"]),
  contactName: z.string().min(2, "Contact name is required"),
  contactEmail: z.string().email("Please enter a valid email"),
  contactPhone: z.string().min(5, "Please enter a valid phone number"),
});

type FormValues = z.infer<typeof formSchema>;

const Onboarding = () => {
  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      companyRole: "both",
      contactName: user?.profile?.first_name && user?.profile?.last_name
        ? `${user.profile.first_name} ${user.profile.last_name}`
        : "",
      contactEmail: user?.email || "",
      contactPhone: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast.error("You must be logged in to create a company");
      return;
    }

    setIsSubmitting(true);
    try {
      // Insert new company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: data.companyName,
          role: data.companyRole,
          contact_name: data.contactName,
          contact_email: data.contactEmail,
          contact_phone: data.contactPhone,
          progress: 0,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Associate user with the company
      const { error: associationError } = await supabase
        .from("company_users")
        .insert({
          user_id: user.id,
          company_id: company.id,
          role: "owner", // First user is the owner
        });

      if (associationError) throw associationError;

      // Refresh user data to get the new company
      await refreshUserData();
      
      toast.success("Company created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating company:", error);
      toast.error(error.message || "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome to Compliant Connect</CardTitle>
          <CardDescription>
            Let's set up your company to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Company Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyRole"
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
                name="contactName"
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
                name="contactEmail"
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
                name="contactPhone"
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
        <CardFooter className="flex justify-end">
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Company"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Onboarding; 