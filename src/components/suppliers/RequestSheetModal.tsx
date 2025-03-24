
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
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface RequestSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  supplierName: string;
}

const formSchema = z.object({
  productName: z.string().min(1, "Product is required"),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const RequestSheetModal: React.FC<RequestSheetModalProps> = ({
  open,
  onOpenChange,
  supplierId,
  supplierName,
}) => {
  const { productSheets, addProductSheet } = useApp();
  const [searchTerm, setSearchTerm] = useState("");

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
    },
  });

  const onSubmit = (values: FormValues) => {
    // Add the new product sheet request
    addProductSheet({
      name: values.productName,
      supplierId: supplierId,
      status: "Requested",
      tags: [],
      note: values.note,
    });
    
    // Show success message
    toast.success(`Product sheet requested from ${supplierName}`);
    
    // Reset form and close modal
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Product Sheet</DialogTitle>
          <DialogDescription>
            Request a new product sheet from {supplierName}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
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
              <Button type="submit" className="bg-brand hover:bg-brand-700">
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RequestSheetModal;
