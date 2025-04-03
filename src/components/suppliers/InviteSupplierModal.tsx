
import React from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client"; // Import Supabase client
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { useCompanyData } from "@/hooks/use-company-data"; // Import useCompanyData

interface InviteSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InviteFormData {
  supplierName: string;
  contactName: string;
  contactEmail: string;
  note: string;
}

const InviteSupplierModal: React.FC<InviteSupplierModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth(); // Get current user
  const { currentCompany } = useCompanyData(); // Get current company
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>();

  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: InviteFormData) => {
    try {
      if (!user) throw new Error("User not authenticated.");
      if (!currentCompany) throw new Error("Current company context is missing.");

      // --- New Logic: Create Supplier Company and Relationship First ---
      console.log("Creating supplier company record:", data.supplierName);
      const { data: newSupplierCompany, error: supplierError } = await supabase
        .from('companies')
        .insert({
          name: data.supplierName,
          contact_name: data.contactName,
          contact_email: data.contactEmail,
          // Add other relevant fields if they exist in your 'companies' table schema
          // e.g., contact_phone: data.contactPhone (if you add phone to form)
        })
        .select()
        .single();

      if (supplierError) throw new Error(`Failed to create supplier company: ${supplierError.message}`);
      if (!newSupplierCompany) throw new Error("Supplier company created but no data returned.");

      console.log("Creating company relationship (pending):", currentCompany.id, "->", newSupplierCompany.id);
      const { error: relationshipError } = await supabase
        .from('company_relationships')
        .insert({
          customer_id: currentCompany.id,
          supplier_id: newSupplierCompany.id,
          status: 'pending', // Set status to pending
          type: 'supplier', // Assuming 'supplier' is a valid type
        });

      if (relationshipError) {
        // Attempt to clean up the created company if relationship fails
        console.error("Failed to create relationship, attempting to delete created company...");
        await supabase.from('companies').delete().eq('id', newSupplierCompany.id);
        throw new Error(`Failed to create company relationship: ${relationshipError.message}`);
      }
      // --- End New Logic ---

      console.log("Invoking invite-user function with:", {
        email: data.contactEmail,
        invitingCompanyId: currentCompany.id,
        invitingUserId: user.id,
        supplierName: data.supplierName,
        contactName: data.contactName,
        // Optionally pass the newly created supplier company ID in metadata
        // invited_supplier_company_id: newSupplierCompany.id
        // Note: data.note is not explicitly sent, but could be added to metadata if needed
      });

      // Call the Edge Function
      const { data: functionResponse, error: functionError } = await supabase.functions.invoke(
        "invite-user", // Name of the Edge Function
        {
          body: {
            email: data.contactEmail,
            invitingCompanyId: currentCompany.id,
            invitingUserId: user.id,
            supplierName: data.supplierName,
            contactName: data.contactName,
            // invited_supplier_company_id: newSupplierCompany.id // Pass if needed by function
          },
        }
      );

      if (functionError) {
        // Handle specific errors returned from the function
        if (functionError.message.includes("User already registered")) {
          throw new Error("This user is already registered.");
        }
        throw functionError; // Re-throw other function errors
      }

      console.log("Invite function response:", functionResponse);
     
      toast.success(`Invitation sent successfully to ${data.contactEmail}`);
      onOpenChange(false);
      reset();
    } catch (error: any) { // Catch any error type
      console.error("Failed to send invitation:", error);
      toast.error(`Failed to send invitation: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite New Supplier</DialogTitle>
          <DialogDescription>
            Send an invitation email to a potential supplier to join your network.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="supplierName">Supplier Name</Label>
              <Input
                id="supplierName"
                placeholder="Enter supplier company name"
                {...register("supplierName", {
                  required: "Supplier name is required",
                })}
              />
              {errors.supplierName && (
                <p className="text-sm text-red-500">{errors.supplierName.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactName">Contact Person</Label>
              <Input
                id="contactName"
                placeholder="Enter contact person's name"
                {...register("contactName", {
                  required: "Contact name is required",
                })}
              />
              {errors.contactName && (
                <p className="text-sm text-red-500">{errors.contactName.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="Enter contact email"
                {...register("contactEmail", {
                  required: "Contact email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
              />
              {errors.contactEmail && (
                <p className="text-sm text-red-500">{errors.contactEmail.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a personalized note to the invitation email"
                className="min-h-[100px]"
                {...register("note")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteSupplierModal;

