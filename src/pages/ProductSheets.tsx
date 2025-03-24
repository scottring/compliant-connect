
import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import PageHeader, { PageHeaderAction } from "@/components/PageHeader";
import ProductSheetCard from "@/components/productSheets/ProductSheetCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const ProductSheets = () => {
  const { productSheets } = useApp();
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
    toast.info(`Viewing product sheet ${productSheetId}`);
    // In a real application, this would navigate to the product sheet detail page
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Sheets"
        description="Manage and track compliance information for your products"
        actions={
          <PageHeaderAction
            label="New Product Sheet"
            onClick={() => toast.info("Creating new product sheet...")}
            icon={
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
          />
        }
      />

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search product sheets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        <Button variant="outline">
          <svg
            className="h-5 w-5 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
          </svg>
          Filter
        </Button>
        <Button variant="outline">
          <svg
            className="h-5 w-5 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          View Info Categories
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
                  onClick={() => handleProductSheetClick(sheet.id)}
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
                  onClick={() => handleProductSheetClick(sheet.id)}
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
                  onClick={() => handleProductSheetClick(sheet.id)}
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
                  onClick={() => handleProductSheetClick(sheet.id)}
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
                  onClick={() => handleProductSheetClick(sheet.id)}
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
                  onClick={() => handleProductSheetClick(sheet.id)}
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
