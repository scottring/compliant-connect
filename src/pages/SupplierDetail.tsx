import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import TagBadge from "@/components/tags/TagBadge";
import RequestSheetModal from "@/components/suppliers/RequestSheetModal";
import { ProductSheet } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { Company } from "@/types";

// Define the database record type for product sheets
interface ProductSheetRecord {
  id: string;
  name: string;
  supplier_id: string;
  requested_by_id: string;
  updated_at: string;
  status?: string;
  tags?: string[];
  [key: string]: any; // Allow for additional fields that may exist
}

// Helper function to map database status to ProductSheet status type
const mapStatus = (status: string | undefined): "draft" | "submitted" | "reviewing" | "approved" | "rejected" => {
  if (!status) return "draft";
  
  switch(status) {
    case "submitted": return "submitted";
    case "reviewing": return "reviewing";
    case "approved": return "approved";
    case "rejected": return "rejected";
    case "draft": return "draft";
    default: return "draft"; // Default to draft for any unrecognized status
  }
};

const SupplierDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companies, productSheets: appProductSheets, tags } = useApp();
  const [comment, setComment] = useState("");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [supplierProductSheets, setSupplierProductSheets] = useState<ProductSheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [supplier, setSupplier] = useState<Company | null>(null);
  const [loadingSupplier, setLoadingSupplier] = useState(true);

  // Load supplier data directly from Supabase
  useEffect(() => {
    const loadSupplier = async () => {
      if (!id) return;
      
      setLoadingSupplier(true);
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) {
          console.error('Error loading supplier:', error);
          toast.error('Failed to load supplier details');
          return;
        }
        
        if (!data) {
          toast.error('Supplier not found');
          return;
        }
        
        // Transform to Company type
        const supplierData: Company = {
          id: data.id,
          name: data.name,
          role: data.role as "supplier" | "customer" | "both",
          contactName: data.contact_name,
          contactEmail: data.contact_email,
          contactPhone: data.contact_phone,
          progress: data.progress || 0
        };
        
        setSupplier(supplierData);
      } catch (err) {
        console.error('Unexpected error loading supplier:', err);
        toast.error('An unexpected error occurred');
      } finally {
        setLoadingSupplier(false);
      }
    };
    
    loadSupplier();
  }, [id]);

  // Load product sheets for this supplier from Supabase
  useEffect(() => {
    const loadProductSheets = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        // Fetch product sheets for this supplier
        const { data, error } = await supabase
          .from('product_sheets')
          .select('*')
          .eq('supplier_id', id);
          
        if (error) {
          console.error('Error loading product sheets for supplier:', error);
          toast.error('Failed to load product sheets');
          return;
        }
        
        if (!data || data.length === 0) {
          setSupplierProductSheets([]);
          return;
        }
        
        // Transform data to match our interface
        const transformedSheets: ProductSheet[] = (data as ProductSheetRecord[]).map(sheet => ({
          id: sheet.id,
          name: sheet.name,
          supplierId: sheet.supplier_id,
          requestedById: sheet.requested_by_id,
          progress: 0, // Use a default progress of 0 for now
          updatedAt: new Date(sheet.updated_at), // Convert to Date object
          status: mapStatus(sheet.status), // Use the mapper function
          tags: sheet.tags || [],
          createdAt: new Date(),
          answers: [],
          questions: []
        }));
        
        setSupplierProductSheets(transformedSheets);
      } catch (err) {
        console.error('Unexpected error loading product sheets for supplier:', err);
        toast.error('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    loadProductSheets();
    
    // Also set up a real-time subscription to product sheets changes
    const productSheetsSubscription = supabase
      .channel('product-sheets-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'product_sheets',
          filter: `supplier_id=eq.${id}`
        },
        (payload) => {
          console.log('Product sheets changed:', payload);
          // Reload the product sheets when changes occur
          loadProductSheets();
        }
      )
      .subscribe();
      
    // Clean up the subscription when the component unmounts
    return () => {
      supabase.removeChannel(productSheetsSubscription);
    };
  }, [id]);

  // Merge in any product sheets from the app context that might not be in Supabase yet
  const allSupplierProductSheets = useMemo(() => {
    // Get sheets from app context
    const contextSheets = appProductSheets.filter(sheet => sheet.supplierId === id);
    
    // Create a map of existing sheets by ID
    const existingSheetIds = new Set(supplierProductSheets.map(sheet => sheet.id));
    
    // Add any sheets from the app context that aren't in the Supabase results
    const additionalSheets = contextSheets.filter(sheet => !existingSheetIds.has(sheet.id));
    
    return [...supplierProductSheets, ...additionalSheets];
  }, [appProductSheets, supplierProductSheets, id]);

  if (!supplier && !loadingSupplier) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Supplier not found</h2>
        <Button onClick={() => navigate("/suppliers")}>Back to Suppliers</Button>
      </div>
    );
  }

  if (loadingSupplier) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Mock tasks data
  const mockTasks = [
    { id: "t1", name: "Contact Supplier", status: "pending", dueDate: "2023-11-10", assignee: "John Doe" },
    { id: "t2", name: "Review Documents", status: "pending", dueDate: "2023-11-15", assignee: "Jane Smith" },
    { id: "t3", name: "Verify Compliance", status: "completed", dueDate: "2023-10-25", assignee: "Michael Brown" },
    { id: "t4", name: "Update Profile", status: "completed", dueDate: "2023-10-20", assignee: "Emily Clark" },
  ];

  // Mock comments data
  const mockComments = [
    { id: "c1", author: "Alice Smith", date: "2023-10-15", text: "Great supplier, always delivers on time." },
    { id: "c2", author: "Alice Smith", date: "2023-09-20", text: "Great supplier, always delivers on time." },
    { id: "c3", author: "Alice Smith", date: "2023-08-05", text: "Great supplier, always delivers on time." },
    { id: "c4", author: "Alice Smith", date: "2023-07-12", text: "Great supplier, always delivers on time." },
  ];

  const handlePostComment = () => {
    if (comment.trim()) {
      toast.success("Comment posted successfully");
      setComment("");
      // In a real application, this would add the comment to the database
    }
  };

  const handleRequestSheet = () => {
    setIsRequestModalOpen(true);
  };

  const getStatusStyle = (status: string) => {
    const statusColors = {
      submitted: { bg: "bg-red-100", text: "text-red-800" },
      reviewing: { bg: "bg-amber-100", text: "text-amber-800" },
      approved: { bg: "bg-green-100", text: "text-green-800" },
      rejected: { bg: "bg-red-100", text: "text-red-800" },
      draft: { bg: "bg-gray-100", text: "text-gray-800" },
    };
    
    return statusColors[status as keyof typeof statusColors] || { bg: "bg-blue-100", text: "text-blue-800" };
  };

  const getStatusLabel = (sheet: ProductSheet) => {
    const status = sheet.status || "";
    
    if (status === "submitted") {
      return "New Request";
    } else if (status === "reviewing") {
      return "In Review";
    } else if (status === "approved") {
      return "Compliant";
    } else if (status === "rejected") {
      return "Rejected";
    } else if (status === "draft") {
      return "Draft";
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getTagBadge = (tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    if (tag) {
      return <TagBadge key={tag.id} tag={tag} />;
    }
    return null;
  };

  const formattedDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title={`Supplier Detail - ${supplier.name}`}
        actions={
          <Button variant="default" className="bg-brand hover:bg-brand-700">
            Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supplier Information */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Supplier Name:</span>
              <p>{supplier.name}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Primary Contact:</span>
              <p>{supplier.contactName}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <p>Active</p>
            </div>
          </CardContent>
        </Card>

        {/* General Information */}
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Address:</span>
              <p>123 Supplier Lane</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Phone:</span>
              <p>{supplier.contactPhone || "(123) 456-7890"}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Email:</span>
              <p>{supplier.contactEmail}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Notes:</span>
              <p>Preferred supplier for electronics.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Product Sheets for {supplier.name}</h2>
          <Button variant="default" className="bg-brand hover:bg-brand-700" onClick={handleRequestSheet}>
            Create PIR
          </Button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product ID</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Info Categories</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allSupplierProductSheets.length > 0 ? (
                  allSupplierProductSheets.map((sheet) => (
                    <TableRow 
                      key={sheet.id}
                      className={sheet.status === "submitted" ? "bg-red-50" : ""}
                    >
                      <TableCell>{sheet.id}</TableCell>
                      <TableCell>{sheet.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {sheet.tags.map((tagId) => getTagBadge(tagId))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`${getStatusStyle(sheet.status).bg} ${getStatusStyle(sheet.status).text} border-none`}
                        >
                          {getStatusLabel(sheet)}
                        </Badge>
                      </TableCell>
                      <TableCell>{sheet.updatedAt ? formattedDate(new Date(sheet.updatedAt)) : "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-brand hover:bg-brand-700 text-white"
                          onClick={() => navigate(`/product-sheets/${sheet.id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      No product sheets available for this supplier
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* PIR Modal */}
      <RequestSheetModal 
        open={isRequestModalOpen} 
        onOpenChange={setIsRequestModalOpen} 
        supplierId={supplier.id} 
        supplierName={supplier.name}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compliance Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="doc1" />
              <label htmlFor="doc1" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Financial Reports (4)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="doc2" />
              <label htmlFor="doc2" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Safety Certificates (3)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="doc3" />
              <label htmlFor="doc3" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Environmental Compliance (2)
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="doc4" />
              <label htmlFor="doc4" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Quality Assurance (5)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockTasks.map((task) => (
              <div key={task.id} className="flex items-center space-x-2">
                <Checkbox id={task.id} checked={task.status === "completed"} />
                <label htmlFor={task.id} className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  <span className={task.status === "completed" ? "line-through" : ""}>
                    {task.name} - Due: {task.dueDate}, Assignee: {task.assignee}
                  </span>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Comments</h2>
        
        <div className="border rounded-md p-4">
          <Textarea 
            placeholder="Here is a sample placeholder" 
            className="min-h-[100px] mb-2"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex justify-end">
            <Button 
              onClick={handlePostComment} 
              className="bg-brand hover:bg-brand-700"
            >
              Post
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          {mockComments.map((comment) => (
            <div key={comment.id} className="border rounded-md p-4 bg-muted/40">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {comment.author.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{comment.author}</p>
                  <p className="text-xs text-muted-foreground">Posted on {comment.date}</p>
                </div>
              </div>
              <p>{comment.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SupplierDetail;
