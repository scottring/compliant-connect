
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
import { useQueryClient } from "@tanstack/react-query"; // Import useQueryClient
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
  const queryClient = useQueryClient(); // Get query client instance
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
    if (!user) { toast.error("User not authenticated."); return; }
    if (!currentCompany) { toast.error("Current company context is missing."); return; }

    let supplierCompanyId: string | null = null;
    let proceedWithInvite = true; // Flag to control if invitation should be sent

    try {
      // 1. Check if company exists by contact email
      const { data: existingCompany, error: checkError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('contact_email', data.contactEmail)
        .maybeSingle(); // Use maybeSingle to handle 0 or 1 result

      if (checkError) throw new Error(`Error checking for existing company: ${checkError.message}`);

      if (existingCompany) {
        // Company exists
        supplierCompanyId = existingCompany.id;
        toast.info(`Company '${existingCompany.name}' already exists.`);

        // 2. Check if supplier relationship already exists
        const { data: existingRel, error: relCheckError } = await supabase
          .from('company_relationships')
          .select('id, status')
          .eq('customer_id', currentCompany.id)
          .eq('supplier_id', supplierCompanyId)
          .maybeSingle();

        if (relCheckError) throw new Error(`Error checking relationship: ${relCheckError.message}`);

        if (existingRel) {
          // Relationship exists
          toast.warning(`A supplier relationship with '${existingCompany.name}' already exists (Status: ${existingRel.status}). No new invitation sent.`);
          proceedWithInvite = false; // Don't send another invite if relationship exists
        } else {
          // Company exists, but no supplier relationship - create relationship only
          // TODO: Ideally, confirm with user here before proceeding. Simulating confirmation for now.
          console.log(`Creating relationship for existing company ${existingCompany.id}`);
          const { error: relationshipError } = await supabase
            .from('company_relationships')
            .insert({
              customer_id: currentCompany.id,
              supplier_id: supplierCompanyId,
              status: 'pending',
              type: 'supplier',
            });

          if (relationshipError) throw new Error(`Failed to create relationship for existing company: ${relationshipError.message}`);
          toast.info(`Added existing company '${existingCompany.name}' as a supplier.`);
        }
      } else {
        // Company does not exist - create company and relationship
        console.log("Creating new company and relationship...");
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: data.supplierName,
            contact_name: data.contactName,
            contact_email: data.contactEmail,
          })
          .select()
          .single();

        if (companyError) throw new Error(`Failed to create company: ${companyError.message}`);
        if (!newCompany) throw new Error("Company created but no data returned.");
        supplierCompanyId = newCompany.id;

        const { error: relationshipError } = await supabase
          .from('company_relationships')
          .insert({
            customer_id: currentCompany.id,
            supplier_id: supplierCompanyId,
            status: 'pending',
            type: 'supplier',
          });

        if (relationshipError) {
          // Rollback company creation if relationship fails
          await supabase.from('companies').delete().eq('id', supplierCompanyId);
          throw new Error(`Failed to create relationship: ${relationshipError.message}`);
        }
        toast.success(`New supplier company '${data.supplierName}' created.`);
      }

      // 3. Invalidate cache regardless of creation/existence
      await queryClient.invalidateQueries({ queryKey: ['suppliers', currentCompany.id] });

      // 4. Proceed with user invitation if applicable
      if (proceedWithInvite && supplierCompanyId) {
        console.log(`Inviting user ${data.contactEmail} for supplier ${supplierCompanyId}`);
        const { error: functionError } = await supabase.functions.invoke(
          "invite-user",
          {
            body: {
              email: data.contactEmail,
              invitingCompanyId: currentCompany.id,
              invitingUserId: user.id,
              supplierName: data.supplierName, // Pass name even if company exists
              contactName: data.contactName,
              invited_supplier_company_id: supplierCompanyId // Use determined ID
            },
          }
        );

        if (functionError) {
          // Handle specific errors
          if (functionError.message.includes("User already registered")) {
            // This might be okay if they exist but aren't linked to this supplier yet
            toast.info(`User ${data.contactEmail} is already registered. Relationship established/updated.`);
          } else {
            throw functionError; // Re-throw other function errors
          }
        } else {
          toast.success(`Invitation sent successfully to ${data.contactEmail}`);
        }
      }

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

