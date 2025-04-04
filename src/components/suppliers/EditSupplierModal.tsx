import React, { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Company, RelationshipType } from "@/types/auth"; // Assuming Company includes relationship details

// Validation schema (can be the same as Add)
const formSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().min(1, "Phone number is required"),
  // Relationship type might not be editable here, or handled differently
  // For now, let's keep it, but consider if it should be updated separately
  relationshipType: z.enum(["direct", "indirect", "potential"] as const),
});

type FormData = z.infer<typeof formSchema>;

interface EditSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>; // onSubmit might need supplier ID too
  loading: boolean;
  supplier: Company | null; // Supplier data to edit
}

export const EditSupplierModal = ({
  open,
  onClose,
  onSubmit,
  loading,
  supplier,
}: EditSupplierModalProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { // Set default values based on supplier prop
      name: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      relationshipType: "direct", // Default if no supplier or relationship
    },
  });

  // Reset form when modal opens or supplier changes
  useEffect(() => {
    if (open && supplier) {
      form.reset({
        name: supplier.name || "",
        contactName: supplier.contact_name || "",
        contactEmail: supplier.contact_email || "",
        contactPhone: supplier.contact_phone || "",
        relationshipType: supplier.relationship?.type || "direct", // Use relationship type if available
      });
    } else if (!open) {
        // Optionally reset to blank defaults when closing
        form.reset({
            name: "",
            contactName: "",
            contactEmail: "",
            contactPhone: "",
            relationshipType: "direct",
        });
    }
  }, [open, supplier, form]);

  const handleSubmit = async (data: FormData) => {
    if (!supplier) return; // Should not happen if modal is opened correctly
    try {
      // The onSubmit passed from the parent should handle adding the supplier ID
      await onSubmit(data);
      // Keep modal open on error? Parent handles closing on success.
    } catch (error) {
      console.error('Error submitting edit form:', error);
      // Error handling might be done in the parent mutation's onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Supplier</DialogTitle>
          <DialogDescription>
            Update the supplier's details below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Form fields are the same as AddSupplierModal */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter contact name" {...field} />
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
                    <Input
                      type="email"
                      placeholder="Enter contact email"
                      {...field}
                    />
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
                    <Input placeholder="Enter contact phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="relationshipType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value} // Use value instead of defaultValue for controlled component
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="indirect">Indirect</SelectItem>
                      <SelectItem value="potential">Potential</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditSupplierModal;