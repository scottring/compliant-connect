import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Company } from "@/types";
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
import { Mail, Plus, Package, Building, SendHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import TagBadge from "@/components/tags/TagBadge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase"; // Correct client import (though we might remove usage)
import { useAuth } from "@/context/AuthContext"; // Import useAuth

interface RequestSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId?: string;
  supplierName?: string;
}

const formSchema = z.object({
  supplierId: z.string().min(1, "Please select a supplier"),
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
  // Get userCompanies and currentCompany from AuthContext
  const { userCompanies, currentCompany } = useAuth(); 
  // const { productSheets, addProductSheet, tags, companies, questions, user } = useApp(); // Remove companies from useApp if not needed elsewhere
  const { productSheets, addProductSheet, tags, questions, user } = useApp(); // Assuming user from useApp is different or less specific
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [addingNewProduct, setAddingNewProduct] = useState(true);
  const [newProductName, setNewProductName] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(supplierId || "");
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>(supplierName || "");
  // Remove suppliers state and loading state - use userCompanies from context
  // const [suppliers, setSuppliers] = useState<Company[]>([]); 
  // const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Use userCompanies directly from context for the dropdown (temporarily remove filter)
  const suppliers = userCompanies; 
  
  // Update selected supplier when props change (Keep this)
  useEffect(() => {
    if (supplierId) {
      setSelectedSupplierId(supplierId);
    }
    if (supplierName) {
      setSelectedSupplierName(supplierName);
    }
  }, [supplierId, supplierName]);
  
  // Get products from the selected supplier
  const supplierProducts = productSheets
    .filter(sheet => sheet.supplierId === selectedSupplierId)
    .map(sheet => ({
      id: sheet.id,
      name: sheet.name
    }));

  // Filter products based on search term
  const filteredProducts = supplierProducts.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: supplierId || "",
      productName: "",
      note: "",
      tags: [],
    },
  });
  
  // Update form value when selected supplier changes
  useEffect(() => {
    form.setValue("supplierId", selectedSupplierId);
  }, [selectedSupplierId, form]);

  const sendEmailNotification = async (supplierEmail: string, productName: string) => {
    // This is a mock implementation - in a real app, you would call an API endpoint
    setIsSendingEmail(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find supplier email from userCompanies (context)
    const supplier = userCompanies.find(company => company.id === selectedSupplierId);
    
    if (!supplier || !supplier.contactEmail) {
      toast.error("Could not find supplier email address");
      setIsSendingEmail(false);
      return false;
    }
    
    console.log(`Sending email notification to ${supplier.contactEmail} about product: ${productName}`);
    
    // In a real application, you would call your backend API here
    toast.success(`Email notification sent to ${supplier.contactEmail}`);
    setIsSendingEmail(false);
    return true;
  };

  const handleCreateNewSupplier = () => {
    // Close the current modal and navigate to add supplier page
    onOpenChange(false);
    navigate("/suppliers");
    // Show a toast to guide the user
    toast.info("Please add a new supplier first, then request a product sheet");
  };

  const onSubmit = async (values: FormValues) => {
    try {
      console.log("Form submitted", values);
      
      // Get the actual supplier ID from form values
      const finalSupplierId = values.supplierId;
    
    // Find supplier name from userCompanies (context)
    const supplier = userCompanies.find(company => company.id === finalSupplierId);
    if (!supplier) {
      toast.error("Invalid supplier selected");
        return;
      }
      
      // Use the new product name if we're adding one, otherwise use the selected product
      const finalProductName = addingNewProduct ? newProductName : values.productName;
      
      if (!finalProductName || finalProductName.trim() === "") {
        toast.error("Please enter a valid product name");
        return;
      }
      
      // Validate that at least one tag is selected
      if (selectedTags.length === 0) {
        toast.error("Please select at least one information category");
        return;
      }
      
      // Find questions that match the selected tags
      const relevantQuestions = questions.filter(question => 
        question.tags.some(tag => selectedTags.includes(tag.id))
      );
      
      console.log("Adding product sheet with:", {
        name: finalProductName,
        supplierId: finalSupplierId,
        selectedTags,
        questions: relevantQuestions,
        note: values.note
      });
      
      // First save to Supabase to ensure it persists in the database
      try {
        const { data, error } = await supabase
          .from('product_sheets')
          .insert({
            name: finalProductName,
            supplier_id: finalSupplierId,
            requested_by_id: user?.companyId || null,
            status: 'submitted',
            tags: selectedTags,
            description: values.note || "",
            updated_at: new Date().toISOString()
          })
          .select();
          
        if (error) {
          console.error('Error creating product sheet:', error);
          toast.error('Failed to create product sheet in database');
          return;
        }
        
        console.log('Product sheet created in Supabase:', data);
      } catch (err) {
        console.error('Unexpected error saving product sheet to Supabase:', err);
        toast.error('An unexpected error occurred while saving');
        return;
      }
      
      // Then add to the local app context
      addProductSheet({
        name: finalProductName,
        supplierId: finalSupplierId,
        requestedById: user?.companyId || null,
        status: "submitted",
        tags: selectedTags,
        questions: relevantQuestions.length > 0 ? relevantQuestions : [],
        description: values.note || ""
      });
    
    // Find supplier email (already found supplier above)
    if (supplier && supplier.contactEmail) {
      // Send email notification
        await sendEmailNotification(supplier.contactEmail, finalProductName);
      }
      
      // Show success message for the product sheet request
      toast.success(`Product Information Request (PIR) sent to ${supplier.name}`);
      
      // Reset form and close modal
      form.reset();
      setSelectedTags([]);
      setAddingNewProduct(true);
      setNewProductName("");
      setSelectedSupplierId("");
      setSelectedSupplierName("");
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

  // Handle supplier change
  const handleSupplierChange = (supplierId: string) => {
    if (supplierId === "create-new") {
      handleCreateNewSupplier();
      return;
    }
    
    // Find supplier from userCompanies (context)
    const supplier = userCompanies.find(c => c.id === supplierId);
    setSelectedSupplierId(supplierId);
    setSelectedSupplierName(supplier?.name || "");
    
    // Reset product selection when supplier changes
    setAddingNewProduct(true);
    setNewProductName("");
    form.setValue("productName", "");
    setSearchTerm("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Product Information Request (PIR)</DialogTitle>
          <DialogDescription>
            Request product information from your suppliers.
            {/* Check the suppliers array derived from userCompanies context */}
            {selectedSupplierId && suppliers.find(c => c.id === selectedSupplierId)?.contactEmail && ( 
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 mr-1" />
                <span>An email notification will be sent to the supplier.</span>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Supplier Selection */}
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Supplier <span className="text-destructive">*</span></FormLabel>
                  <div className="space-y-2">
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleSupplierChange(value);
                        }}
                        defaultValue={selectedSupplierId || field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="pl-10">
                            {/* Use suppliers derived from context */}
                            <SelectValue placeholder={suppliers.length === 0 && !currentCompany ? "Select your company first" : "Select a supplier"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Use suppliers derived from context */}
                          {suppliers.length > 0 ? ( 
                            suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name} 
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              No suppliers found
                            </div>
                          )}
                          <SelectItem value="create-new" className="text-brand font-medium">
                            <div className="flex items-center">
                              <Plus className="h-4 w-4 mr-2" />
                              Create New Supplier
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {!field.value && <FormMessage />}
                </FormItem>
              )}
            />

            {/* Only show product selection if a supplier is selected */}
            {selectedSupplierId && (
              <>
                {!addingNewProduct && filteredProducts.length > 0 ? (
                  <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select {selectedSupplierName} Product</FormLabel>
                        <div className="space-y-2">
                          <div className="relative">
                            <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                              {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                  <SelectItem key={product.id} value={product.name}>
                                    {product.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-center text-sm text-muted-foreground">
                                  No products found
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormItem>
                    <FormLabel>Add New Product <span className="text-destructive">*</span></FormLabel>
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

                {filteredProducts.length > 0 && (
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={toggleAddNewProduct}
                      className="flex items-center gap-1"
                    >
                      {addingNewProduct ? (
                        <>Use Existing Product</>
                      ) : (
                        <><Plus className="h-3 w-3" /> Add New Product</>
                      )}
                    </Button>
                  </div>
                )}

                <FormItem>
                  <FormLabel>Information Categories (Tags) <span className="text-destructive">*</span></FormLabel>
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
                  {selectedTags.length === 0 && (
                    <p className="text-sm text-destructive mt-1">At least one information category is required</p>
                  )}
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
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-brand hover:bg-brand-700"
                disabled={
                  isSendingEmail || 
                  !selectedSupplierId ||
                  (addingNewProduct && !newProductName.trim()) || 
                  selectedTags.length === 0
                }
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
