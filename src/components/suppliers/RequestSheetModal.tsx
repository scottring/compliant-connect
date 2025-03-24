
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Plus, Search, SendHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import TagBadge from "@/components/tags/TagBadge";

interface RequestSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  supplierName: string;
}

const formSchema = z.object({
  productName: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const RequestSheetModal: React.FC<RequestSheetModalProps> = ({
  open,
  onOpenChange,
  supplierId,
  supplierName,
}) => {
  const { productSheets, addProductSheet, tags, companies, questions } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [addingNewProduct, setAddingNewProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");

  // Mock products (in a real app, these would come from an API or context)
  const mockProducts = [
    { id: "p1", name: "Product 1" },
    { id: "p2", name: "Product 2" },
    { id: "p3", name: "Chemical Product 1" },
    { id: "p4", name: "Chemical Product 2" },
    { id: "p5", name: "Product 3" },
    { id: "p6", name: "Product 4" },
    { id: "p7", name: "Product 5" },
  ];

  // Filter products based on search term
  const filteredProducts = mockProducts.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: "",
      note: "",
      tags: [],
    },
  });

  const sendEmailNotification = async (supplierEmail: string, productName: string) => {
    // This is a mock implementation - in a real app, you would call an API endpoint
    setIsSendingEmail(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find supplier email from companies
    const supplier = companies.find(company => company.id === supplierId);
    
    if (!supplier || !supplier.contactEmail) {
      toast.error("Could not find supplier email address");
      setIsSendingEmail(false);
      return false;
    }
    
    console.log(`Sending email notification to ${supplier.contactEmail} about product: ${productName}`);
    
    // In a real application, you would call your backend API here
    // For now, we'll just simulate a successful email
    toast.success(`Email notification sent to ${supplier.contactEmail}`);
    setIsSendingEmail(false);
    return true;
  };

  const onSubmit = async (values: FormValues) => {
    try {
      console.log("Form submitted", values);
      
      // Use the new product name if we're adding one, otherwise use the selected product
      const finalProductName = addingNewProduct ? newProductName : values.productName;
      
      if (!finalProductName || finalProductName.trim() === "") {
        toast.error("Please enter a valid product name");
        return;
      }
      
      // Find questions that match the selected tags
      const relevantQuestions = questions.filter(question => 
        question.tags.some(tag => selectedTags.includes(tag.id))
      );
      
      console.log("Adding product sheet with:", {
        name: finalProductName,
        supplierId,
        selectedTags,
        questions: relevantQuestions,
        note: values.note
      });
      
      // Add the new product sheet request with selected tag IDs
      addProductSheet({
        name: finalProductName,
        supplierId: supplierId,
        requestedById: "c1", // Assuming c1 is the current user's company ID
        status: "submitted",
        tags: selectedTags, // Just use the tag IDs directly
        questions: relevantQuestions, // Add questions that match selected tags
        description: values.note || ""
      });
      
      // Find supplier email
      const supplier = companies.find(company => company.id === supplierId);
      
      if (supplier && supplier.contactEmail) {
        // Send email notification
        await sendEmailNotification(supplier.contactEmail, finalProductName);
      }
      
      // Show success message for the product sheet request
      toast.success(`Product Information Request (PIR) sent to ${supplierName}`);
      
      // Reset form and close modal
      form.reset();
      setSelectedTags([]);
      setAddingNewProduct(false);
      setNewProductName("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An error occurred while submitting the form. Please try again.");
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId) 
        : [...prev, tagId]
    );
  };

  const toggleAddNewProduct = () => {
    setAddingNewProduct(!addingNewProduct);
    if (!addingNewProduct) {
      form.setValue("productName", "");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Product Information Request (PIR)</DialogTitle>
          <DialogDescription>
            Request product information from {supplierName}.
            {companies.find(c => c.id === supplierId)?.contactEmail && (
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 mr-1" />
                <span>An email notification will be sent to the supplier.</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!addingNewProduct ? (
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Existing Product</FormLabel>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a product" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredProducts.map((product) => (
                            <SelectItem key={product.id} value={product.name}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormItem>
                <FormLabel>Add New Product</FormLabel>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter new product name..."
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                  />
                </div>
                {!newProductName && <p className="text-sm text-destructive">Product name is required</p>}
              </FormItem>
            )}

            <div className="flex justify-end">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={toggleAddNewProduct}
                className="flex items-center gap-1"
              >
                {addingNewProduct ? (
                  <>Back to Existing Products</>
                ) : (
                  <><Plus className="h-3 w-3" /> Add New Product</>
                )}
              </Button>
            </div>

            <FormItem>
              <FormLabel>Information Categories (Tags)</FormLabel>
              <div className="flex flex-wrap gap-2 p-4 border rounded-md">
                {tags.map((tag) => (
                  <TagBadge 
                    key={tag.id}
                    tag={tag}
                    selected={selectedTags.includes(tag.id)}
                    onClick={() => toggleTag(tag.id)}
                  />
                ))}
                {tags.length === 0 && (
                  <div className="text-sm text-muted-foreground italic">No information categories available</div>
                )}
              </div>
            </FormItem>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional information or requirements..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-brand hover:bg-brand-700"
                disabled={isSendingEmail || (addingNewProduct && !newProductName.trim())}
              >
                {isSendingEmail ? (
                  <>
                    <SendHorizontal className="mr-2 h-4 w-4 animate-pulse" />
                    Sending...
                  </>
                ) : (
                  <>Submit Request</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RequestSheetModal;
