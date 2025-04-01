import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
// Use Company from auth types, Tag from main types
import { Company as AuthCompany, RelationshipType } from "@/types/auth"; // Rename imported Company
import { Tag as AppTag } from "@/types";
import { Label } from "@/components/ui/label"; // Keep this Label import
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Plus, Package, Building, SendHorizontal, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import TagBadge from "@/components/tags/TagBadge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // Keep supabase client
import { useCompanyData } from "@/hooks/use-company-data"; // Keep for currentCompany
import { useTags } from "@/hooks/use-tags"; // Use tags hook
import { useRelatedSuppliers } from "@/hooks/use-related-suppliers"; // Import the new hook
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';

interface RequestSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId?: string;
  supplierName?: string;
}

// Type for products fetched for the supplier dropdown
type SupplierProduct = {
    id: string;
    name: string;
};

// --- Reusable Fetch Supplier Products Hook ---
const useFetchSupplierProducts = (supplierId: string | undefined) => {
    return useQuery<SupplierProduct[], Error>({
        queryKey: ['supplierProducts', supplierId],
        queryFn: async () => {
            if (!supplierId) return [];
            // Fetch from 'products' table
            const { data, error } = await supabase
                .from('products') // Corrected table name
                .select('id, name')
                .eq('supplier_id', supplierId);
            if (error) throw new Error(`Failed to fetch products: ${error.message}`);
            return (data || []) as SupplierProduct[]; // Correct type assertion
        },
        enabled: !!supplierId,
    });
};
// --- End Fetch Supplier Products Hook ---

// --- Log Hook Usage ---
const useLoggingTags = () => {
    const tagsData = useTags();
    useEffect(() => {
        console.log('[DEBUG] useTags result:', tagsData);
    }, [tagsData]);
    return tagsData;
};
// --- End Log Hook Usage ---

// Define Company type based on the one used in useRelatedSuppliers
type Company = ReturnType<typeof useRelatedSuppliers>['data'] extends (infer U)[] | undefined ? U : never;

// Define Form Schema and Values
const formSchema = z.object({
  supplierId: z.string().min(1, "Please select a supplier"),
  productName: z.string().optional(), // Keep if using combobox for existing products
  note: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

// --- Reusable Create PIR Mutation Hook ---
type CreatePIRInput = {
    productName: string;
    supplierId: string;
    customerId: string;
    note?: string;
    tagIds: string[];
    isNewProduct: boolean;
};
type CreatePIRResult = { pirId: string; productId: string };

const useCreatePIRMutation = (
    queryClient: ReturnType<typeof useQueryClient>
): UseMutationResult<CreatePIRResult, Error, CreatePIRInput> => {
    return useMutation<CreatePIRResult, Error, CreatePIRInput>({
        mutationFn: async (input) => {
            let productId: string | null = null;
            if (input.isNewProduct) {
                const { data: newProductData, error: productError } = await supabase
                    .from('products')
                    .insert({ name: input.productName, supplier_id: input.supplierId })
                    .select('id').single();
                if (productError) throw new Error(`Failed to create product: ${productError.message}`);
                productId = newProductData.id;
            } else {
                const { data: existingProduct, error: fetchError } = await supabase
                    .from('products').select('id').eq('name', input.productName).eq('supplier_id', input.supplierId).maybeSingle();
                if (fetchError) throw new Error(`Failed to find existing product: ${fetchError.message}`);
                if (!existingProduct) throw new Error(`Selected product "${input.productName}" not found.`);
                productId = existingProduct.id;
            }
            if (!productId) throw new Error("Could not determine product ID.");
            const { data: pirRequestData, error: pirRequestError } = await supabase
                .from('pir_requests').insert({ product_id: productId, customer_id: input.customerId, status: 'draft' }).select('id').single();
            if (pirRequestError) throw new Error(`Failed to create PIR request: ${pirRequestError.message}`);
            const pirId = pirRequestData.id;
            if (input.tagIds.length > 0) {
                const tagLinks = input.tagIds.map(tagId => ({ pir_id: pirId, tag_id: tagId }));
                const { error: pirTagsError } = await supabase.from('pir_tags').insert(tagLinks);
                if (pirTagsError) console.warn(`PIR created (ID: ${pirId}), but failed to link tags: ${pirTagsError.message}`);
            }
            return { pirId, productId };
         },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['pirRequests'] });
            queryClient.invalidateQueries({ queryKey: ['supplierPirs'] });
            toast.success(`Product Information Request (PIR) created (ID: ${data.pirId})`);
         },
        onError: (error) => {
            console.error("Error submitting PIR:", error);
            toast.error(`Failed to submit PIR: ${error.message}`);
         },
    });
};
// --- End Create PIR Mutation Hook ---


const RequestSheetModal: React.FC<RequestSheetModalProps> = ({
  open,
  onOpenChange,
  supplierId, // Use correct prop name
  supplierName, // Use correct prop name
}) => {
  // Get current company context
  const { currentCompany, isLoadingCompanies: isLoadingCurrentCompany } = useCompanyData();
  // Fetch related suppliers based on current company
  const { data: relatedSuppliers, isLoading: isLoadingSuppliers, error: errorSuppliers } = useRelatedSuppliers(currentCompany?.id);

  const { tags: appTags, isLoadingTags, errorTags } = useLoggingTags(); // Use logging hook
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [addingNewProduct, setAddingNewProduct] = useState(true);
  const [newProductName, setNewProductName] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(supplierId || "");
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>(supplierName || "");
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Fetch products for the currently selected supplier
  const { data: productSheets, isLoading: isLoadingProductSheets, error: errorProductSheets } = useFetchSupplierProducts(selectedSupplierId);

  // --- Add Initial Log ---
  useEffect(() => {
      console.log('[DEBUG] RequestSheetModal mounted/props updated:', { open, supplierId, supplierName });
  }, [open, supplierId, supplierName]);
  // --- End Initial Log ---

  // Memoize formatted products for combobox
  const supplierProducts = React.useMemo(() =>
    (productSheets || [])
      .map(product => ({
        value: product.name.toLowerCase(),
        label: product.name,
        id: product.id
      }))
  , [productSheets]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { supplierId: supplierId || "", productName: "", note: "" },
  });

  // Effect to update local state and form when props change
  useEffect(() => {
    if (supplierId) {
      console.log('[DEBUG] useEffect [supplierId, supplierName]: Updating state from props', { supplierId, supplierName });
      setSelectedSupplierId(supplierId);
      form.setValue("supplierId", supplierId);
    }
    if (supplierName) {
      setSelectedSupplierName(supplierName);
    }
    if (!supplierId) {
      setAddingNewProduct(true);
    }
    // If supplierId is provided, ensure it's in the fetched list or clear selection
    if (supplierId && relatedSuppliers && !relatedSuppliers.find(s => s.id === supplierId)) {
        console.warn(`[DEBUG] Provided supplierId ${supplierId} not found in related suppliers. Clearing selection.`);
        setSelectedSupplierId("");
        setSelectedSupplierName("");
        form.setValue("supplierId", "");
    }
  }, [supplierId, supplierName, form]);

  // Effect to reset product mode when supplier changes or products load
  useEffect(() => {
      if (selectedSupplierId && !isLoadingProductSheets) {
          console.log('[DEBUG] useEffect [selectedSupplierId, productSheets, isLoadingProductSheets]: Resetting product mode', { selectedSupplierId, productSheets, isLoadingProductSheets, errorProductSheets });
          const defaultToAdd = !productSheets || productSheets.length === 0;
          setAddingNewProduct(defaultToAdd);
          setNewProductName("");
          form.setValue("productName", "");
      }
  }, [selectedSupplierId, productSheets, isLoadingProductSheets, form]);

  // Update form supplierId when internal state changes
  useEffect(() => {
    if (selectedSupplierId !== form.getValues("supplierId")) {
       console.log('[DEBUG] useEffect [selectedSupplierId, form]: Syncing form supplierId', { selectedSupplierId });
       form.setValue("supplierId", selectedSupplierId);
    }
  }, [selectedSupplierId, form]);

  // Email simulation
  const sendEmailNotification = async (supplierEmail: string | null | undefined, productName: string) => {
    setIsSendingEmail(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Use snake_case for contact email
    if (!supplierEmail) {
      toast.error("Could not find supplier email address");
      setIsSendingEmail(false);
      return false;
    }
    console.log(`Sending email notification to ${supplierEmail} about product: ${productName}`);
    toast.success(`Email notification sent to ${supplierEmail}`);
    setIsSendingEmail(false);
    return true;
  };

  const handleCreateNewSupplier = () => {
    onOpenChange(false);
    navigate("/suppliers");
    toast.info("Please add a new supplier first, then request a product sheet");
  };

  // Create PIR Mutation
  const createPIRMutation = useCreatePIRMutation(queryClient);

  const onSubmit = async (values: FormValues) => {
    const finalProductName = addingNewProduct ? newProductName.trim() : values.productName;
    if (!finalProductName) { toast.error("Please enter or select a product name."); return; }
    if (selectedTags.length === 0) { toast.error("Please select at least one tag."); return; }
    if (!values.supplierId) { toast.error("Please select a supplier."); return; }
    if (!currentCompany?.id) { toast.error("Current company context missing."); return; }

    // Find supplier details from the fetched related suppliers
    const supplier = relatedSuppliers?.find(company => company.id === values.supplierId);
    if (!supplier) { toast.error("Invalid supplier selected"); return; }

    try {
        await createPIRMutation.mutateAsync({
            productName: finalProductName,
            supplierId: values.supplierId,
            customerId: currentCompany.id,
            note: values.note,
            tagIds: selectedTags,
            isNewProduct: addingNewProduct,
        });

        // Send Email (Optional) - Use snake_case
        if (supplier.contact_email) { // Use snake_case
            await sendEmailNotification(supplier.contact_email, finalProductName);
        }

        // Reset form and close modal on success
        form.reset({ supplierId: '', productName: '', note: '' });
        setSelectedTags([]);
        setAddingNewProduct(true);
        setNewProductName("");
        setSelectedSupplierId("");
        setSelectedSupplierName("");
        onOpenChange(false);

    } catch (error) { console.error("PIR Submission failed:", error); }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
   };
  const toggleAddNewProduct = () => {
    setAddingNewProduct(prev => !prev);
    if (addingNewProduct) { form.setValue("productName", ""); }
    else { setNewProductName(""); }
   };
  const handleSupplierChange = (newSupplierId: string) => {
    if (newSupplierId === "create-new") { handleCreateNewSupplier(); return; }
    // Find supplier details from the fetched related suppliers
    const supplier = relatedSuppliers?.find(c => c.id === newSupplierId);
    setSelectedSupplierId(newSupplierId);
    setSelectedSupplierName(supplier?.name || "");
    form.setValue("supplierId", newSupplierId);
   };

  // Update loading state calculation
  const isFormLoading = isLoadingCurrentCompany || isLoadingSuppliers || isLoadingTags || createPIRMutation.isPending || isSendingEmail || isLoadingProductSheets;

  // --- Add Top Level Log ---
  console.log('[DEBUG] Rendering RequestSheetModal', { isFormLoading, selectedSupplierId, addingNewProduct, isLoadingProductSheets, errorProductSheets, isLoadingSuppliers, errorSuppliers, isLoadingTags });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Product Information Request (PIR)</DialogTitle>
          <DialogDescription asChild> {/* Render as child (div) instead of p */}
            <div> {/* Container div */}
            Request product information from your suppliers.
            {selectedSupplierId && relatedSuppliers?.find(c => c.id === selectedSupplierId)?.contact_email && (
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 mr-1" />
                <span>An email notification will be sent to the supplier.</span>
              </div>
            )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Supplier Selection */}
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem className="relative pt-1"> {/* Add relative positioning and slight padding top */}
                  <FormLabel>Select Supplier <span className="text-destructive">*</span></FormLabel>
                  <Building className="absolute left-3 top-[calc(50%+10px)] -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" /> {/* Position relative to FormItem, adjust top, add z-index */}
                      <Select
                        onValueChange={handleSupplierChange}
                        value={field.value}
                        disabled={isLoadingSuppliers || isLoadingCurrentCompany} // Update disabled state
                      >
                        <FormControl>
                          <SelectTrigger className="pl-10">
                            <SelectValue placeholder={isLoadingSuppliers ? "Loading suppliers..." : ((relatedSuppliers?.length ?? 0) === 0 ? "No suppliers found" : "Select a supplier")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(relatedSuppliers?.length ?? 0) > 0 ? (
                            relatedSuppliers!.map((supplier) => ( // Use relatedSuppliers
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product Section - Conditional */}
            {selectedSupplierId && (
              <>
                {isLoadingProductSheets ? (
                    <div className="text-sm text-muted-foreground">Loading products...</div>
                ) : addingNewProduct ? (
                   <FormItem>
                     <Label htmlFor="newProductNameInput">Add New Product <span className="text-destructive">*</span></Label> {/* Use base Label */}
                     {/* Apply relative positioning to the container div */}
                     <div className="relative"> {/* Add a relative container */}
                       <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /> {/* Icon positioned within the div */}
                       {/* Render Input directly, remove FormControl */}
                       <Input
                         id="newProductNameInput" // Add id for label linking
                         className="pl-10" // Keep padding for icon
                         placeholder="Enter new product name..."
                         value={newProductName} // Still uses local state
                         onChange={(e) => setNewProductName(e.target.value)} // Still uses local state
                       />
                     </div>
                     {!newProductName.trim() && <p className="text-sm text-destructive pt-1">Product name is required.</p>}
                   </FormItem>
                ) : (
                   <FormField
                     control={form.control}
                     name="productName"
                     render={({ field }) => (
                       <FormItem className="flex flex-col">
                         <FormLabel>Select {selectedSupplierName} Product <span className="text-destructive">*</span></FormLabel>
                         <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                           <PopoverTrigger asChild>
                               <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                 <span className="flex items-center justify-between w-full"> {/* Wrap children in a styled span */}
                                 <div className="flex items-center">
                                   <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                                   {field.value ? supplierProducts.find(p => p.label === field.value)?.label : "Select product..."}
                                 </div>
                                 <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                 </span>
                               </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                             <Command>
                               <CommandInput placeholder="Search product..." />
                               <CommandList>
                                 <CommandEmpty>No product found.</CommandEmpty>
                                 <CommandGroup>
                                   {supplierProducts.map((product) => (
                                     <CommandItem value={product.label} key={product.id} onSelect={() => { form.setValue("productName", product.label); setPopoverOpen(false); }}>
                                       <Check className={cn("mr-2 h-4 w-4", field.value === product.label ? "opacity-100" : "opacity-0")} />
                                       {product.label}
                                     </CommandItem>
                                   ))}
                                 </CommandGroup>
                               </CommandList>
                             </Command>
                           </PopoverContent>
                         </Popover>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 )}

                {/* Toggle Button */}
                {!isLoadingProductSheets && supplierProducts.length > 0 && (
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={toggleAddNewProduct} className="flex items-center gap-1">
                      {addingNewProduct ? 'Use Existing Product' : <><Plus className="h-3 w-3" /> Add New Product</>}
                    </Button>
                  </div>
                )}

                {/* Tags Section */}
                <FormItem>
                  <FormLabel>Information Categories (Tags) <span className="text-destructive">*</span></FormLabel>
                  <div> {/* Wrap tag container and error message */}
                    <div className="flex flex-wrap gap-2 p-4 border rounded-md min-h-[60px]">
                      {isLoadingTags ? ( <div className="text-sm text-muted-foreground">Loading tags...</div> )
                       : errorTags ? ( <div className="text-sm text-red-500">Error loading tags</div> )
                       : appTags.length > 0 ? (
                        appTags.map((tag) => ( <TagBadge key={tag.id} tag={tag} selected={selectedTags.includes(tag.id)} onClick={() => toggleTag(tag.id)} /> ))
                       ) : ( <div className="text-sm text-muted-foreground italic">No tags available</div> )}
                    </div>
                    {selectedTags.length === 0 && ( <p className="text-sm text-destructive mt-1">At least one category is required</p> )}
                  </div>
                </FormItem>

                {/* Note Section */}
                <FormField control={form.control} name="note" render={({ field }) => ( <FormItem> <FormLabel>Note (optional)</FormLabel> <FormControl> <Textarea placeholder="Add an optional note..." {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isFormLoading}> Cancel </Button>
              <Button type="submit" disabled={isFormLoading || !selectedSupplierId}>
                {createPIRMutation.isPending ? "Sending..." : "Send Request"}
                <SendHorizontal className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RequestSheetModal;
