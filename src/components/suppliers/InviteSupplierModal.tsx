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
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { useCompanyData } from "@/hooks/use-company-data"; // Import useCompanyData
import { supabase } from "@/integrations/supabase/client"; // Import supabase client for functions invoke

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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>();

  const { user } = useAuth(); // Get current user
  const { currentCompany } = useCompanyData(); // Get current company

  React.useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: InviteFormData) => {
    // Use isSubmitting from react-hook-form for loading state
    try {
      if (!user || !currentCompany) {
        toast.error("User or company context is missing.");
        return;
      }

      console.log("Invoking send-email function for invitation:", data);

      // Invoke the Edge Function
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'SUPPLIER_INVITATION',
          invite_email: data.contactEmail,
          inviter_name: user.user_metadata?.name || user.email || 'A user', // Use available user info
          inviter_company_name: currentCompany.name,
          // Optionally add note or signup link here if needed by function/template
          // note: data.note 
        },
      });

      if (error) throw error;

      toast.success(`Invitation sent to ${data.supplierName} (${data.contactEmail})`);
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error("Failed to send invitation:", error);
      toast.error(`Failed to send invitation: ${error.message || 'Please try again.'}`);
    }
    // No need to manually set loading state, react-hook-form handles isSubmitting
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
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
