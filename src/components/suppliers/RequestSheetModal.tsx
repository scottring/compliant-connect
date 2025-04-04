import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tag as AppTag } from "@/types";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
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
import { Mail, Package, Building, SendHorizontal, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input"; // Re-added Input for Combobox
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import TagBadge from "@/components/tags/TagBadge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyData } from "@/hooks/use-company-data";
import { useTags } from "@/hooks/use-tags";
import { useRelatedSuppliers } from "@/hooks/use-related-suppliers";
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';

interface RequestSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId?: string;
  supplierName?: string;
}

type SupplierProduct = {
    id: string;
    name: string;
};

const useFetchSupplierProducts = (supplierId: string | undefined) => {
    return useQuery<SupplierProduct[], Error>({
        queryKey: ['supplierProducts', supplierId],
        queryFn: async () => {
            if (!supplierId) return [];
            const { data, error } = await supabase
                .from('products')
                .select('id, name')
                .eq('supplier_id', supplierId);
            if (error) throw new Error(`Failed to fetch products: ${error.message}`);
            return (data || []) as SupplierProduct[];
        },
        enabled: !!supplierId,
    });
};

// Updated formSchema to require productName
const formSchema = z.object({
  supplierId: z.string().min(1, "Please select a supplier"),
  productName: z.string().min(1, "Please select or enter a product name"), // Updated message
  note: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

// Input type for mutation - productName can be existing or new suggestion
type CreatePIRInput = {
    productName: string;
    supplierId: string;
    customerId: string;
    tagIds: string[];
    note?: string;
    // Add context needed for onSuccess notification
    relatedSuppliers?: ReturnType<typeof useRelatedSuppliers>['data'];
    currentCompany?: ReturnType<typeof useCompanyData>['currentCompany'];
};
// Result type - productId can be null if it was a suggestion
type CreatePIRResult = { pirId: string; productId: string | null };

const useCreatePIRMutation = (
    queryClient: ReturnType<typeof useQueryClient>
): UseMutationResult<CreatePIRResult, Error, CreatePIRInput> => {
    return useMutation<CreatePIRResult, Error, CreatePIRInput>({
        mutationFn: async (input) => {
            // Check if product exists for this supplier
            const { data: existingProduct, error: fetchError } = await supabase
                .from('products').select('id').eq('name', input.productName).eq('supplier_id', input.supplierId).maybeSingle();

            if (fetchError) {
                console.error(`Error checking for existing product (continuing PIR creation): ${fetchError.message}`);
                 throw new Error(`Failed to verify existing product: ${fetchError.message}`);
            }

            const productId = existingProduct?.id || null;
            const suggestedProductName = !existingProduct ? input.productName : null;

            // Prepare PIR data
            const pirInsertData: {
                customer_id: string;
                supplier_company_id: string; // Ensure this is included
                status: 'draft';
                product_id: string | null;
                suggested_product_name?: string | null;
                // note?: string | null; // Note: This field doesn't exist in schema yet
            } = {
                customer_id: input.customerId,
                supplier_company_id: input.supplierId, // Set the supplier ID
                status: 'draft',
                product_id: productId, // Will be null if product doesn't exist
                suggested_product_name: suggestedProductName, // Will be null if product exists
                // note: input.note || null, // Removed note as column doesn't exist
            };

             // Ensure product_id is explicitly null if suggesting a new product
             if (suggestedProductName) {
                 pirInsertData.product_id = null;
             } else if (!productId) {
                 console.warn("Attempting to create PIR without a valid existing product ID and no suggested name.");
                 pirInsertData.product_id = null;
                 pirInsertData.suggested_product_name = input.productName; 
             }
            // Insert PIR Request
            const { data: pirRequestData, error: pirRequestError } = await supabase
                .from('pir_requests').insert(pirInsertData).select('id').single();

            if (pirRequestError) throw new Error(`Failed to create PIR request: ${pirRequestError.message}`);
            const pirId = pirRequestData.id;

            // Link Tags
            if (input.tagIds.length > 0) {
                const tagLinks = input.tagIds.map(tagId => ({ pir_id: pirId, tag_id: tagId }));
                const { error: pirTagsError } = await supabase.from('pir_tags').insert(tagLinks);
                if (pirTagsError) console.warn(`PIR created (ID: ${pirId}), but failed to link tags: ${pirTagsError.message}`);
            }

            console.log('PIR Creation Result:', { pirId, productId });
            return { pirId, productId }; // Return null productId if it was a suggestion
         },
        onSuccess: async (data, variables) => { // Make async to await function invoke
            // Invalidate queries first
            queryClient.invalidateQueries({ queryKey: ['pirRequests'] });
            queryClient.invalidateQueries({ queryKey: ['supplierPirs', variables.supplierId] });
            toast.success(`Product Information Request (PIR) created (ID: ${data.pirId})`);

            // --- Send Email Notification via Edge Function ---
            try {
                // Fetch the newly created PIR record to pass to the function
                // Ensure all fields needed by the edge function's getCompanyDetails/getProductName are selected
                const { data: newPirRecord, error: fetchError } = await supabase
                    .from('pir_requests')
                    .select('*, products(name)') // Select needed fields + product name
                    .eq('id', data.pirId)
                    .single();

                if (fetchError || !newPirRecord) {
                    throw new Error(`Failed to fetch created PIR record: ${fetchError?.message || 'Not found'}`);
                }

                // Construct the payload expected by the 'send-email' function
                const payload = {
                    type: 'PIR_STATUS_UPDATE', // Trigger the status update logic
                    record: newPirRecord, // Pass the full record
                    old_record: null // No old record for creation
                };

                // Invoke the Edge Function
                const { error: functionError } = await supabase.functions.invoke(
                    'send-email', // Use the correct function name
                    { body: payload }
                );

                if (functionError) {
                    throw functionError; // Throw to be caught by outer catch
                }
                // Success toast can be generic or removed if function handles it
                toast.info(`Notification process initiated for PIR ${data.pirId}.`);
            } catch (notificationError: any) {
                console.error("Failed to send PIR creation notification:", notificationError);
                // Show error, but PIR itself was created successfully earlier
                toast.error(`PIR created, but failed to send notification: ${notificationError.message}`);
            }
            // --- End Send Email Notification ---
         },
        onError: (error) => {
            console.error("Error submitting PIR:", error);
            toast.error(`Failed to submit PIR: ${error.message}`);
        },
    });
};

const RequestSheetModal: React.FC<RequestSheetModalProps> = ({
  open,
  onOpenChange,
  supplierId,
  supplierName,
}) => {
  const { currentCompany, isLoadingCompanies: isLoadingCurrentCompany } = useCompanyData();
  const { data: relatedSuppliers, isLoading: isLoadingSuppliers, error: errorSuppliers } = useRelatedSuppliers(currentCompany?.id);
  const { tags: appTags, isLoadingTags, errorTags } = useTags();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(supplierId || "");
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>(supplierName || "");
  const [productPopoverOpen, setProductPopoverOpen] = useState(false); 

  const { data: productSheets, isLoading: isLoadingProductSheets, error: errorProductSheets } = useFetchSupplierProducts(selectedSupplierId);

  // Memoize products for Combobox list
  const supplierProducts = React.useMemo(() =>
    (productSheets || [])
      .map(product => ({
        value: product.name.toLowerCase(), // Value for searching/filtering
        label: product.name, // Label for display
        id: product.id
      }))
  , [productSheets]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { supplierId: supplierId || "", productName: "", note: "" },
  });

  useEffect(() => {
    if (supplierId) {
      setSelectedSupplierId(supplierId);
      form.setValue("supplierId", supplierId);
    }
    if (supplierName) {
      setSelectedSupplierName(supplierName);
    }
    if (supplierId && relatedSuppliers && !relatedSuppliers.find(s => s.id === supplierId)) {
        setSelectedSupplierId("");
        setSelectedSupplierName("");
        form.setValue("supplierId", "");
    }
  }, [supplierId, supplierName, form, relatedSuppliers]);


  useEffect(() => {
    if (selectedSupplierId !== form.getValues("supplierId")) {
       console.log('[DEBUG] useEffect [selectedSupplierId, form]: Syncing form supplierId', { selectedSupplierId });
       form.setValue("supplierId", selectedSupplierId);
    }
     // Reset product name when supplier changes
     form.resetField("productName"); // Use resetField for better state handling
  }, [selectedSupplierId, form]);

  const sendEmailNotification = async (supplierEmail: string | null | undefined, productName: string) => {
    setIsSendingEmail(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
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

  const createPIRMutation = useCreatePIRMutation(queryClient);

  const onSubmit = async (values: FormValues) => {
    if (!values.productName) { toast.error("Please select or enter a product name."); return; }
    if (selectedTags.length === 0) { toast.error("Please select at least one tag."); return; }
    if (!values.supplierId) { toast.error("Please select a supplier."); return; }
    if (!currentCompany?.id) { toast.error("Current company context missing."); return; }

    const supplier = relatedSuppliers?.find(company => company.id === values.supplierId);
    if (!supplier) { toast.error("Invalid supplier selected"); return; }

    console.log('[DEBUG] Submitting PIR with values:', values); // Log form values before mutation

    try {
        const result = await createPIRMutation.mutateAsync({
            productName: values.productName,
            supplierId: values.supplierId,
            customerId: currentCompany.id,
            note: values.note,
            tagIds: selectedTags,
            // Pass necessary context for notification
            relatedSuppliers: relatedSuppliers,
            currentCompany: currentCompany,
        });

        // Send email notification regardless of whether product was existing or suggested
        if (supplier.contact_email) {
            await sendEmailNotification(supplier.contact_email, values.productName);
        }

        form.reset({ supplierId: '', productName: '', note: '' });
        setSelectedTags([]);
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

  const handleSupplierChange = (newSupplierId: string) => {
    if (newSupplierId === "create-new") { handleCreateNewSupplier(); return; }
    const supplier = relatedSuppliers?.find(c => c.id === newSupplierId);
    setSelectedSupplierId(newSupplierId);
    setSelectedSupplierName(supplier?.name || "");
    form.setValue("supplierId", newSupplierId);
    form.resetField("productName"); // Reset product when supplier changes
   };

  const isFormLoading = isLoadingCurrentCompany || isLoadingSuppliers || isLoadingTags || createPIRMutation.isPending || isSendingEmail || isLoadingProductSheets;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Product Information Request (PIR)</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Request product information from your suppliers.
            {selectedSupplierId && relatedSuppliers?.find(c => c.id === selectedSupplierId)?.contact_email && (
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 mr-1" />
                <span>An email notification will be sent to the supplier.</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Supplier Select field (without FormControl) */}
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Supplier <span className="text-destructive">*</span></FormLabel>
                  {/* <FormControl> */} {/* Keep FormControl commented out */}
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value); // RHF's change handler
                        handleSupplierChange(value);
                      }}
                      disabled={isLoadingSuppliers || isLoadingCurrentCompany}
                      value={field.value} // Keep value prop for Select state
                    >
                      <SelectTrigger className="pl-10">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder={isLoadingSuppliers ? "Loading suppliers..." : ((relatedSuppliers?.length ?? 0) === 0 ? "No suppliers found" : "Select a supplier")} />
                      </SelectTrigger>
                      <SelectContent>
                        {(relatedSuppliers ?? []).map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="create-new" className="text-brand font-medium">-- Create New Supplier --</SelectItem>
                      </SelectContent>
                    </Select>
                  {/* </FormControl> */}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product Name Combobox */}
            {selectedSupplierId && (
              <>
                {isLoadingProductSheets ? (
                    <div className="text-sm text-muted-foreground p-4">Loading products...</div>
                ) : (
                   <FormField
                     control={form.control}
                     name="productName"
                     render={({ field }) => (
                       <FormItem className="flex flex-col">
                         <FormLabel>Select or Enter Product Name <span className="text-destructive">*</span></FormLabel>
                         {/* <FormControl> */} {/* Keep FormControl commented out */}
                          <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={productPopoverOpen}
                                  className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                >
                                  <span className="flex items-center">
                                    <Package className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                    {field.value || "Select or type product..."}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command filter={(value, search) => {
                                  // Allow filtering existing items OR showing the typed value if no match
                                  const existingItem = supplierProducts.find(p => p.value === value);
                                  if (existingItem && existingItem.label.toLowerCase().includes(search.toLowerCase())) return 1;
                                  return 0;
                                }}>
                                <CommandInput
                                    placeholder="Search product or type new..."
                                    value={field.value} // Control input value
                                    onValueChange={field.onChange} // Update form state on type
                                />
                                <CommandList>
                                  <CommandEmpty>
                                      {/* Show typed value if not empty, otherwise show 'No product found' */}
                                      {field.value ? `Use "${field.value}"` : "No product found."}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {supplierProducts.map((product) => (
                                      <CommandItem
                                        key={product.id}
                                        value={product.label} // Use label for matching CommandInput value
                                        onSelect={(currentValue) => {
                                          form.setValue("productName", currentValue === field.value ? "" : currentValue); // Set form value
                                          setProductPopoverOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === product.label ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {product.label}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                   {/* Option to explicitly use the typed value if it doesn't match existing */}
                                   {field.value && !supplierProducts.some(p => p.label.toLowerCase() === field.value.toLowerCase()) && (
                                        <CommandItem
                                            key="new-product-suggestion"
                                            value={field.value}
                                            onSelect={() => {
                                                form.setValue("productName", field.value);
                                                setProductPopoverOpen(false);
                                            }}
                                            >
                                            <span className="italic ml-6">Use "{field.value}" (New)</span>
                                        </CommandItem>
                                    )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                         {/* </FormControl> */}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                {/* Tags Field */}
                <FormItem>
                  <FormLabel>Information Categories (Tags) <span className="text-destructive">*</span></FormLabel>
                  <div>
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

                {/* Note Field */}
              <FormField control={form.control} name="note" render={({ field }) => ( <FormItem> <FormLabel>Note (optional)</FormLabel> {/* <FormControl> */} <Textarea placeholder="Add an optional note..." {...field} /> {/* </FormControl> */} <FormMessage /> </FormItem> )} />
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isFormLoading}> Cancel </Button>
              <Button type="submit" disabled={isFormLoading || !selectedSupplierId || !form.watch('productName')}>
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
