import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import ProductSheetCard from "@/components/productSheets/ProductSheetCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, Filter, Tag, Plus } from "lucide-react";

const ProductSheets = () => {
  const { productSheets } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProductSheets = productSheets.filter((sheet) =>
    sheet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const drafts = filteredProductSheets.filter((sheet) => sheet.status === "draft");
  const submitted = filteredProductSheets.filter((sheet) => sheet.status === "submitted");
  const reviewing = filteredProductSheets.filter((sheet) => sheet.status === "reviewing");
  const approved = filteredProductSheets.filter((sheet) => sheet.status === "approved");
  const rejected = filteredProductSheets.filter((sheet) => sheet.status === "rejected");

  const handleProductSheetClick = (productSheetId: string) => {
    navigate(`/product-sheet/${productSheetId}`);
  };

  const handleCreateProductSheet = () => {
    toast.info("Creating new product sheet...");
    // In a real app, this would navigate to a product sheet creation page
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Sheets"
        description="Manage and track compliance information for your products"
        actions={
          <PageHeaderAction
            label="New Product Sheet"
            onClick={handleCreateProductSheet}
            icon={<Plus className="h-4 w-4" />}
          />
        }
      />

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search product sheets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-5 w-5 mr-2" />
          Filter
        </Button>
        <Button variant="outline">
          <Tag className="h-5 w-5 mr-2" />
          View Tags
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({filteredProductSheets.length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({drafts.length})</TabsTrigger>
          <TabsTrigger value="submitted">Submitted ({submitted.length})</TabsTrigger>
          <TabsTrigger value="reviewing">Reviewing ({reviewing.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProductSheets.length > 0 ? (
              filteredProductSheets.map((sheet) => (
                <ProductSheetCard
                  key={sheet.id}
                  productSheet={sheet}
                  onClick={() => handleProductSheetClick(sheet.id as string)}
                />
              ))
            ) : (
              <div className="col-span-full flex justify-center items-center p-8">
                <p className="text-muted-foreground">No product sheets found</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="draft" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drafts.length > 0 ? (
              drafts.map((sheet) => (
                <ProductSheetCard
                  key={sheet.id}
                  productSheet={sheet}
                  onClick={() => handleProductSheetClick(sheet.id as string)}
                />
              ))
            ) : (
              <div className="col-span-full flex justify-center items-center p-8">
                <p className="text-muted-foreground">No draft product sheets found</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="submitted" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {submitted.length > 0 ? (
              submitted.map((sheet) => (
                <ProductSheetCard
                  key={sheet.id}
                  productSheet={sheet}
                  onClick={() => handleProductSheetClick(sheet.id as string)}
                />
              ))
            ) : (
              <div className="col-span-full flex justify-center items-center p-8">
                <p className="text-muted-foreground">No submitted product sheets found</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="reviewing" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviewing.length > 0 ? (
              reviewing.map((sheet) => (
                <ProductSheetCard
                  key={sheet.id}
                  productSheet={sheet}
                  onClick={() => handleProductSheetClick(sheet.id as string)}
                />
              ))
            ) : (
              <div className="col-span-full flex justify-center items-center p-8">
                <p className="text-muted-foreground">No product sheets under review</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="approved" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approved.length > 0 ? (
              approved.map((sheet) => (
                <ProductSheetCard
                  key={sheet.id}
                  productSheet={sheet}
                  onClick={() => handleProductSheetClick(sheet.id as string)}
                />
              ))
            ) : (
              <div className="col-span-full flex justify-center items-center p-8">
                <p className="text-muted-foreground">No approved product sheets found</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="rejected" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rejected.length > 0 ? (
              rejected.map((sheet) => (
                <ProductSheetCard
                  key={sheet.id}
                  productSheet={sheet}
                  onClick={() => handleProductSheetClick(sheet.id as string)}
                />
              ))
            ) : (
              <div className="col-span-full flex justify-center items-center p-8">
                <p className="text-muted-foreground">No rejected product sheets found</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductSheets;
