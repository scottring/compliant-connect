import React, { useState, useEffect } from 'react'; // Added useEffect
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Relative path
import { useCompanyData } from '../hooks/use-company-data'; // Relative path
import { supabase } from '../integrations/supabase/client'; // Relative path
import PageHeader from '../components/PageHeader'; // Relative path
import { Button } from '../components/ui/button'; // Relative path
import { Input } from '../components/ui/input'; // Relative path
import { Label } from '../components/ui/label'; // Relative path
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/ui/card'; // Relative path
import { toast } from 'sonner';
import { Database } from '../types/supabase'; // Relative path

type InsertPIRRequest = Database['public']['Tables']['pir_requests']['Insert'];

const RequestPIR: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCompany } = useCompanyData();

  // TODO: Replace with actual state and components for selecting supplier, product, tags
  const [supplierName, setSupplierName] = useState("Mock Supplier Inc."); // Placeholder
  const [productName, setProductName] = useState("Mock Product XYZ"); // Placeholder
  const [tagsInput, setTagsInput] = useState("Product, Compliance"); // Placeholder
  const [isLoading, setIsLoading] = useState(false);

  // Clear session storage flags on mount
  useEffect(() => {
      sessionStorage.removeItem('mockPirRound');
      sessionStorage.removeItem('mockPIRAnswers');
  }, []);


  const handleSendRequest = async () => {
    if (!user || !currentCompany) {
      toast.error("User or company information is missing.");
      return;
    }
    if (!supplierName.trim() || !productName.trim()) {
        toast.error("Supplier and Product are required.");
        return;
    }

    setIsLoading(true);
    toast.info("Sending PIR request...");

    try {
      // TODO: Fetch actual supplier_company_id and product_id based on selection
      const mockSupplierId = 'mock-supplier-id-from-selection'; // Replace with actual lookup
      const mockProductId = 'mock-product-id-from-selection'; // Replace with actual lookup

      const newPirRequest: InsertPIRRequest = {
        customer_id: currentCompany.id,
        supplier_company_id: mockSupplierId, // Use fetched ID
        product_id: mockProductId, // Use fetched ID
        title: `PIR Request for ${productName}`, // Auto-generate title?
        description: `Compliance information request for ${productName} from ${supplierName}.`,
        status: 'pending_supplier', // Set initial status for the new flow
        // due_date: Calculate due date?
      };

      const { data, error } = await supabase
        .from('pir_requests')
        .insert(newPirRequest)
        .select()
        .single();

      if (error) throw error;

      // TODO: Associate selected tags with the new PIR request (pir_tags table)
      const newPirId = data.id;
      const selectedTagNames = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      
      // TODO: Fetch actual tag IDs based on selectedTagNames
      // For now, let's assume we have mock IDs or skip this step if tag fetching isn't implemented
      const mockTagIds = selectedTagNames.map(name => `mock-tag-id-for-${name}`); // Placeholder

      if (mockTagIds.length > 0) {
          const pirTagInserts = mockTagIds.map(tagId => ({
              pir_id: newPirId,
              tag_id: tagId
          }));
          const { error: tagError } = await supabase.from('pir_tags').insert(pirTagInserts);
          if (tagError) {
              // Maybe warn but don't fail the whole request? Or handle differently?
              console.error("Error associating tags:", tagError);
              toast.warning("PIR created, but failed to associate tags.");
          }
      }

      toast.success("PIR request sent successfully!");
      navigate('/product-sheets'); // Navigate back to the list

    } catch (error: any) {
      console.error("Error sending PIR request:", error);
      toast.error(`Failed to send request: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Request Product Information"
        description="Select a supplier, product, and required information tags."
      />
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                placeholder="Select supplier..."
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                disabled={isLoading}
              />
              {/* TODO: Replace with actual Select/Autocomplete component */}
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Input
                id="product"
                placeholder="Select product..."
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={isLoading}
              />
              {/* TODO: Replace with actual Select/Autocomplete component */}
            </div>
          </div>
           <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="Select required tags..."
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                disabled={isLoading}
              />
              {/* TODO: Replace with actual multi-select component */}
            </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSendRequest} disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Request"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RequestPIR;