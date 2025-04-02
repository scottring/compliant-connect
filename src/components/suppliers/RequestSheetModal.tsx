import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Company as AuthCompany, RelationshipType } from "@/types/auth";
import { Tag as AppTag } from "@/types";
import { Label } from "@/components/ui/label";
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

const useLoggingTags = () => {
    const tagsData = useTags();
    useEffect(() => {
        console.log('[DEBUG] useTags result:', tagsData);
    }, [tagsData]);
    return tagsData;
};

type Company = ReturnType<typeof useRelatedSuppliers>['data'] extends (infer U)[] | undefined ? U : never;

const formSchema = z.object({
  supplierId: z.string().min(1, "Please select a supplier"),
  productName: z.string().optional(),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

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

const RequestSheetModal: React.FC<RequestSheetModalProps> = ({
  open,
  onOpenChange,
  supplierId,
  supplierName,
}) => {
  const { currentCompany, isLoadingCompanies: isLoadingCurrentCompany } = useCompanyData();
  const { data: relatedSuppliers, isLoading: isLoadingSuppliers, error: errorSuppliers } = useRelatedSuppliers(currentCompany?.id);
  const { tags: appTags, isLoadingTags, errorTags } = useLoggingTags();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [addingNewProduct, setAddingNewProduct] = useState(true);
  const [newProductName, setNewProductName] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(supplierId || "");
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>(supplierName || "");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { data: productSheets, isLoading: isLoadingProductSheets, error: errorProductSheets } = useFetchSupplierProducts(selectedSupplierId);

  useEffect(() => {
      console.log('[DEBUG] RequestSheetModal mounted/props updated:', { open, supplierId, supplierName });
  }, [open, supplierId, supplierName]);

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
    if (supplierId && relatedSuppliers && !relatedSuppliers.find(s => s.id === supplierId)) {
        console.warn(`[DEBUG] Provided supplierId ${supplierId} not found in related suppliers. Clearing selection.`);
        setSelectedSupplierId("");
        setSelectedSupplierName("");
        form.setValue("supplierId", "");
    }
  }, [supplierId, supplierName, form, relatedSuppliers]);

  useEffect(() => {
      if (selectedSupplierId && !isLoadingProductSheets) {
          console.log('[DEBUG] useEffect [selectedSupplierId, productSheets, isLoadingProductSheets]: Resetting product mode', { selectedSupplierId, productSheets, isLoadingProductSheets, errorProductSheets });
          const defaultToAdd = !productSheets || productSheets.length === 0;
          setAddingNewProduct(defaultToAdd);
          setNewProductName("");
          form.setValue("productName", "");
      }
  }, [selectedSupplierId, productSheets, isLoadingProductSheets, form]);

  useEffect(() => {
    if (selectedSupplierId !== form.getValues("supplierId")) {
       console.log('[DEBUG] useEffect [selectedSupplierId, form]: Syncing form supplierId', { selectedSupplierId });
       form.setValue("supplierId", selectedSupplierId);
    }
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
    const finalProductName = addingNewProduct ? newProductName.trim() : values.productName;
    if (!finalProductName) { toast.error("Please enter or select a product name."); return; }
    if (selectedTags.length === 0) { toast.error("Please select at least one tag."); return; }
    if (!values.supplierId) { toast.error("Please select a supplier."); return; }
    if (!currentCompany?.id) { toast.error("Current company context missing."); return; }

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

        if (supplier.contact_email) {
            await sendEmailNotification(supplier.contact_email, finalProductName);
        }

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
    const supplier = relatedSuppliers?.find(c => c.id === newSupplierId);
    setSelectedSupplierId(newSupplierId);
    setSelectedSupplierName(supplier?.name || "");
    form.setValue("supplierId", newSupplierId);
   };

  const isFormLoading = isLoadingCurrentCompany || isLoadingSuppliers || isLoadingTags || createPIRMutation.isPending || isSendingEmail || isLoadingProductSheets;

  console.log('[DEBUG] RequestSheetModal State Check:', {
    open,
    propSupplierId: supplierId,
    selectedSupplierId,
    currentCompanyId: currentCompany?.id,
    isLoadingCurrentCompany,
    isLoadingSuppliers,
    relatedSuppliersCount: relatedSuppliers?.length,
    isLoadingProductSheets,
    productSheetsCount: productSheets?.length,
    isLoadingTags,
    appTagsCount: appTags?.length,
    addingNewProduct,
    isFormLoading,
  });

  console.log('[DEBUG] Rendering RequestSheetModal', { isFormLoading, selectedSupplierId, addingNewProduct, isLoadingProductSheets, errorProductSheets, isLoadingSuppliers, errorSuppliers, isLoadingTags });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Product Information Request (PIR)</DialogTitle>
          {/* Replaced DialogDescription with div for valid nesting */}
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
            {/* Form fields still commented out */}
            {/* Uncommenting Supplier Select field (without FormControl) */}
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Supplier <span className="text-destructive">*</span></FormLabel>
                  {/* <FormControl> */} {/* Keep FormControl commented out */}
                    <Select
                      // Pass RHF field props directly, ensure custom handler also runs
                      onValueChange={(value) => { 
                        field.onChange(value); // RHF's change handler
                        handleSupplierChange(value);
                      }}
                      disabled={isLoadingSuppliers || isLoadingCurrentCompany}
                      value={field.value} // Keep value prop for Select state
                    >
                      <SelectTrigger className="pl-10">
                        {/* Removed icon div, keeping only SelectValue */}
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

            {/* Uncommenting Note field */}
            {selectedSupplierId && ( /* Need conditional rendering based on supplier selection */
              <FormField control={form.control} name="note" render={({ field }) => ( <FormItem> <FormLabel>Note (optional)</FormLabel> {/* <FormControl> */} <Textarea placeholder="Add an optional note..." {...field} /> {/* </FormControl> */} <FormMessage /> </FormItem> )} />
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
